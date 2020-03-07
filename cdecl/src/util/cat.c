#include "prepi.h"

/*******************************************************************************
 ** Base 64 encoder                                                          |||
 ******************************************************************************/
global uint cat_ignore_trailing_newline = 0;
global void
cat(FILE *in, FILE *out)
{
    local_persist uchar input_buffer[BUFFER_SIZE];

    while (!(feof(in) || ferror(in))) {
        uint len;

        len = fread(input_buffer, 1, INBUFFER, in);
        fwrite(input_buffer, 1, len, out);
    }

    return;
}

/*******************************************************************************
 ** Main                                                                     |||
 ******************************************************************************/

global int
main(int argc, char **argv)
{
    FILE *in  = NULL;
    FILE *out = NULL;

    if (argc >= 2) {
        if (NULL == (in = fopen(argv[1], "r"))) {
            fprintf(stderr, "Couldn't open file '%s': ", argv[1]);
            perror("");
            return 0;
        }
    } else {
        in = stdin;
    }
    out = stdout;

    setvbuf(in, NULL, _IONBF, 0);
    setvbuf(out, NULL, _IONBF, 0);

    cat(in, out);

    return 0;
}

