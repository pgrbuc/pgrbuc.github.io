#include <stdlib.h>
#include <string.h>
#include <stdio.h>

#define MIN(a,b) (((a)<(b))?(a):(b))

#define debugf(fmt, ...) \
    do { fprintf(stderr, fmt "\n", __VA_ARGS__); } while (0)
#define errf(fmt, ...) \
    do { fprintf(stderr, fmt "\n", __VA_ARGS__); exit(EXIT_FAILURE); } while (0)
#define perrf(fmt, ...) \
    do { fprintf(stderr, fmt ": ", __VA_ARGS__); perror(""); exit(EXIT_FAILURE); } while (0)

#define global
#define local_persist static
#define internal static

typedef unsigned int  uint;
typedef unsigned char uchar;

#define BUFFER  (1024*3)
#define MAX_FILES 128

#ifdef PREDICT
    #define likely(x) __builtin_expect((x),1)
    #define unlikely(x) __builtin_expect((x),0)
    #define unreachable() __builtin_unreachable()
#else
    #define likely(x) (x)
    #define unlikely(x) (x)
    #define unreachable()
#endif

global char IncludePath[BUFFER] = {0};

/*******************************************************************************
 ** file_t                                                                   |||
 ******************************************************************************/

typedef struct file_struct {
    char filename[BUFFER];
    char buffer[BUFFER+1];
    uint i;
    uint len;
    FILE *fp;
} file_t;

internal file_t*
file_alloc(uint depth)
{
    local_persist file_t file_buffer[MAX_FILES] = {0};
    if (depth >= (MAX_FILES-1))
        errf("Max number of nested include exceeded (%d)", MAX_FILES);
    return &(file_buffer[depth]);
}

internal void
rotate_read(file_t *fil, uint start, uint end)
{
    /*
     * rotate_read(fil, 0, 0) reads 1*BUFFER chars into the file_t fil
     *
     * since the include directive could be half
     *      read 01: [.................#INCLUDE]
     *      read 02: [_ME "header.h"...........]
     *
     * rotate_read(my_file, BUFFER-8, BUFFER)
     *  - keeps the last 8 chars
     *  - moves them to the beginning of the buffer
     *  - reads BUFFER-8 chars into the buffer
     *      read 01: [.................#INCLUDE]
     *      rotread: [#INCLUDE_ME "header.h"...]
     *
     */
    char *dest = fil->buffer;
    const uint n = end - start;
    uint res;

    memmove(dest, fil->buffer + start, n);

    res = fread(dest+n, 1, BUFFER-n, fil->fp);

    if (ferror(fil->fp))
        perrf("couldn't read from file '%s'", fil->filename);

    fil->len = n + res;
    fil->i   = 0;
    fil->buffer[fil->len] = '\0';
}

/*******************************************************************************
 ** Buffered IO                                                              |||
 ******************************************************************************/

internal void
output_c(const int c)
{
    /*
     * the output of this utility is written to stdout every BUFFER chars or
     * whenever an EOF is passed to output_c
     */
    local_persist char output_buffer[BUFFER];
    local_persist uint i = 0;

    output_buffer[i++] = c;

    if (i == (BUFFER-1) || c == EOF) {
        if (c == EOF)
            i--;

        fwrite(output_buffer, 1, i, stdout);
        i = 0;
    }
}

extern volatile int *trash;
internal int break_me()
{
    *trash = 0;
    return 0;
}
volatile int junk;
volatile int *trash = &junk;

internal int
include_hit(file_t *fil)
{
    local_persist const char inc[]   = "#" "INCLUDE_ME ";
    local_persist const uint inc_len = sizeof(inc) - 1;

    const uint buf_len  = fil->len - fil->i;
    const uint starts   = buf_len > inc_len;
    const char *buf     = fil->buffer + ((fil->i)+inc_len);

    /* check for partial hit ie "#INC\0" matches */
    if (0 != strncmp(inc, fil->buffer + fil->i, MIN(inc_len, buf_len)))
        return 0;

    uint ends  = 0;

    /* increment until end of buffer or end of quote */
    for (uint i = 1; i <= buf_len; i++) {
        if (buf[i] == '"') {
            ends = 1;

            /* TODO fix this bandaid for off by one error elsewhere */
            ends = i < BUFFER-1;
            break;
        }
    }

    if (buf_len == 51) break_me();
    //debugf("\n%d %d %d %d", buf_len, starts, ends, !feof(fil->fp));
    //debugf("%.*s", MIN(30, buf_len), fil->buffer + fil->i);

    /* check if complete hit */
    if (starts && ends)
        return 1;

    /* if no more input to read no hit, then a partial hit means nada */
    if (feof(fil->fp))
        return 0;

    /* rotates buffer so it starts with the partial hit, and fills the rest */
    rotate_read(fil, fil->i, fil->len);

    /* it sort of has to run through all of these tests again unfortunately */
    return include_hit(fil);
}

internal void
extract_filename_from_include(file_t *new, file_t *fil)
{
    char *src  = fil->buffer;
    char *dest = new->filename;
    uint i = fil->i;
    uint j = 0;

    /* skip include directive */
    while (src[i] != '"') {
        if (src[i] == '\0')
            errf("%s", "Bug in program, got a directive hit incorrectly");
        i++;
    }

    /* skip opening quote */
    i++;

    /* append quoted contents to directory name */
    strcpy(dest, IncludePath);
    j = strlen(IncludePath);
    while (src[i] != '"') {
        dest[j++] = src[i++];

        /* check for overflows in case of forgetten closing quote */
        if (j >= (BUFFER-1)) {
            dest[BUFFER-1] = '\0';
            errf("File path too long: ['%s']...", dest);
        }

        if (i >= (BUFFER-1)) {
            src[BUFFER-1] = '\0';
            errf("Couldn't find end quote for filename in: ['%s']...", src + fil->i);
        }
    }

    /* skip closing quote */
    i++;
    fil->i = i;
}

internal void
process_file(file_t *fil)
{
    local_persist uint recursive_depth = 1;

    if (fil->fp == NULL)
        if(NULL == (fil->fp = fopen(fil->filename, "r")))
            errf("can't open %s", fil->filename);

    setvbuf(fil->fp, NULL, _IONBF, 0);

    while (1) {
        int c = EOF;

        if (fil->i == fil->len) {
            rotate_read(fil, 0, 0);
            if (fil->i == fil->len)
                break;
        }

        if (include_hit(fil)) {
            file_t *next = file_alloc(recursive_depth++);
            memset(next, 0, sizeof(file_t));
            extract_filename_from_include(next, fil);
            process_file(next);
            recursive_depth--;
        }

        c = fil->buffer[(fil->i)++];

        if (fil->i == fil->len && c == '\n' && feof(fil->fp)) {
            /* skip last newline */
        } else {
            output_c(c);
        }
    }

    fclose(fil->fp);
    fil->fp = NULL;
}

internal void
load_directory_name(char const * const arg_dirname)
{
    /*
     * adds '/' directory seperator if argument not passed with one
     */
    const uint min_filename_len = 1;
    const uint dirname_len = strlen(arg_dirname);
    const uint no_seperator = arg_dirname[dirname_len-1] != '/';
    const uint max = ((BUFFER-1) - min_filename_len) - no_seperator;

    if (dirname_len >= max)
        errf("Directory too long ('%s' exceeds size %d)", arg_dirname, BUFFER);

    strcpy(IncludePath, arg_dirname);

    if (no_seperator) {
        strcat(IncludePath, "/");
    }
}

int
main(int argc, char **argv)
{
    file_t *in = file_alloc(0);
    char *arg_dirname  = argv[1];
    char *arg_filename = argv[2];

    if (argc >= 3) {
        strcpy(in->filename, arg_filename);
    } else if (argc >= 2) {
        strcpy(in->filename, "<stdin>");
        in->fp = stdin;
    } else {
        errf("usage %s INCLUDE_DIR [INCLUDE_FILE]", argv[0]);
    }

    setvbuf(stdin, NULL, _IONBF, 0);
    setvbuf(stdout, NULL, _IONBF, 0);

    load_directory_name(arg_dirname);
    process_file(in);
    output_c('\n');
    output_c(EOF);

    return EXIT_SUCCESS;
}

