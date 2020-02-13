#include <stdio.h>

#define errf(fmt, ...) \
do { fprintf(stderr, fmt "\n", __VA_ARGS__); exit(EXIT_FAILURE); } while (0)

#define perrf(fmt, ...) \
do { fprintf(stderr, fmt ": ", __VA_ARGS__); perror(""); exit(EXIT_FAILURE); } while (0)

#define global
#define local_persist static
#define internal static

typedef unsigned char uchar;
typedef unsigned int  uint;
typedef unsigned long ulong;

/*
 * The input buffer feeds 3 bytes per loop, and the output buffer is fed 4
 * bytes per loop, so BUFFER needs to be defined as being a multiple of 3 AND
 * 4 so that you don't have to flush the output or read more input in the
 * middle of a loop.
 */

#define BUFFER (1024 * 3 * 4)

/*
 * These built-ins didn't do a whole lot, but rearranging the code so that
 * they _could_ be used sped things up significantly. IE, writing a fast
 * branch and a slow branch and branching based on a test that gives a 0 or 1.
 */

#ifdef PREDICT
    #define likely(x) __builtin_expect((x),1)
    #define unlikely(x) __builtin_expect((x),0)
    #define unreachable() __builtin_unreachable()
#else
    #define likely(x) (x)
    #define unlikely(x) (x)
    #define unreachable()
#endif

/*******************************************************************************
 ** Buffered Input                                                           |||
 ******************************************************************************/

internal uint
input_buffer(FILE *fp, uchar **buffer)
{
    local_persist uint len = 0;
    local_persist uchar buf[BUFFER];
    len = fread(buf, 1, BUFFER, fp);
    *buffer = buf;
    return len;
}

/*******************************************************************************
 ** Buffered Output                                                          |||
 ******************************************************************************/

enum { OUTPUT_PAD = 64, OUTPUT_FLUSH = 65 };

internal void
output_sextet(uchar sextet)
{
    local_persist const uchar output_lookup[] = {
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
        'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
        'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
        'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
        'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
        'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
        'w', 'x', 'y', 'z', '0', '1', '2', '3',
        '4', '5', '6', '7', '8', '9', '+', '/',
        '=', '\0',
    };

    local_persist uchar output_buffer[BUFFER];
    local_persist uint i = 0;

    output_buffer[i++] = output_lookup[sextet];

    if (i == (BUFFER-1) || sextet == OUTPUT_FLUSH) {
        i -= (sextet == OUTPUT_FLUSH);

        fwrite(output_buffer, 1, i, stdout);
        i = 0;
    }
}

/*******************************************************************************
 ** Base 64 encoder                                                          |||
 ******************************************************************************/

internal void
base64(FILE *fp)
{
    ulong byt;
    uchar *buf;
    uint input_len = 0;

    if (0 == (input_len = input_buffer(fp, &buf))) {
        return;
    }

    while (1) {
        if (likely(input_len >= 3)) {
            byt = (buf[0] << 16) | (buf[1] << 8) | buf[2];
            output_sextet((byt >> 18) & 0x3f);
            output_sextet((byt >> 12) & 0x3f);
            output_sextet((byt >>  6) & 0x3f);
            output_sextet((byt >>  0) & 0x3f);
            buf       += 3;
            input_len -= 3;
            continue;
        } else if (unlikely(input_len == 2)) {
            byt = (buf[0] << 16) | (buf[1] << 8);
            output_sextet((byt >> 18) & 0x3f);
            output_sextet((byt >> 12) & 0x3f);
            output_sextet((byt >>  6) & 0x3f);
            output_sextet(OUTPUT_PAD);
            break;
        } else if (unlikely(input_len == 1)) {
            byt = (buf[0] << 16);
            output_sextet((byt >> 18) & 0x3f);
            output_sextet((byt >> 12) & 0x3f);
            output_sextet(OUTPUT_PAD);
            output_sextet(OUTPUT_PAD);
            break;
        } else if (unlikely(input_len == 0)) {
            if (0 == (input_len = input_buffer(fp, &buf))) {
                break;
            }
            continue;
        }
    }

    output_sextet(OUTPUT_FLUSH);

    return;
}

/*******************************************************************************
 ** Main                                                                     |||
 ******************************************************************************/

int
main(int argc, char **argv)
{
    FILE *fp = NULL;

    if (argc >= 2) {
        if (NULL == (fp = fopen(argv[1], "r"))) {
            fprintf(stderr, "Couldn't open file '%s': ", argv[1]);
            perror("");
            return -1;
        }
    } else {
        fp = stdin;
    }

    setvbuf(fp,  NULL, _IONBF, 0);
    setvbuf(stdout, NULL, _IONBF, 0);

    base64(fp);

    return 0;
}

