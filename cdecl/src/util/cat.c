#include "prepi.h"

/*******************************************************************************
 ** Base 64 encoder                                                          |||
 ******************************************************************************/
global uint cat_skip_last_newline = 1;

global void
cat_parse_args(uint argc, char **argv, FILE **in, FILE **out) {
    char *opt_outputname;

    if ((!argv) || (!argv[0])) {
        debugf("%lu %p", argc, (void*)argv);
    }

    opt_outputname = argv_eat_option(&argc, argv, "-o");

    for (uint i=1; i<argc; i++) {
        debugf("%s: unrecognized option '%s'", argv[0], argv[i]);
    }

    if (opt_outputname) {
        if (0 == strcmp(opt_outputname, "-")) {
            *out = stdout;
        } else if (NULL == (*out = fopen(opt_outputname, "rb"))) {
            debugf("%s: can't open output file '%s'", argv[0], opt_outputname);
        }
    }

    setvbuf(*in, NULL, _IONBF, 0);
    setvbuf(*out, NULL, _IONBF, 0);

    assert(*in != NULL);
    assert(*out != NULL);
}



global void
cat(int argc, char **argv, FILE *in, FILE *out)
{
    enum const_vals {
        BUFFER_SIZE = 4096,
    };

    local_persist uchar input_buffer[BUFFER_SIZE];

    cat_parse_args(argc, argv, &in, &out);

    uint eof = 0;
    while (!eof) {
        uint len = 0;
        uint garbage;

        len = fread(input_buffer, 1, BUFFER_SIZE, in);

        /* test if done */
        garbage = fread(NULL, 1, 0, in);
        (void)garbage;
        eof = feof(in) || ferror(in);

        if (eof && cat_skip_last_newline && input_buffer[len-1] == '\n')
            len--;

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
    cat(argc, argv, stdin, stdout);
    return 0;
}

