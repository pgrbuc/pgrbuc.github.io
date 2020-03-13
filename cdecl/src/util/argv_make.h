#include <assert.h>
#include <ctype.h>
#include <stddef.h>
#include <stdint.h>
#include <string.h>

static const char make_argv_delims[][2] = {
    { '(',  ')'  },
    { '\'', '\'' },
    { '"',  '"'  },
};
static const size_t make_argv_delims_siz = sizeof(make_argv_delims) / sizeof(*make_argv_delims);

struct argv_result {
    char **argv;
    size_t argc;
};

static size_t
argv_make(
    const char *text,
    char *buf,   const size_t buf_siz,  size_t *buf_len,
    char **argv, const size_t argv_siz, size_t *argv_len
) {
    size_t buf_i = 0;
    const size_t dry_run = (
        buf == NULL  || buf_siz == 0 ||
        argv == NULL || argv_siz == 0
    );

    *argv_len = 0;


    for (size_t v=0; dry_run || v < argv_siz; v++) {
        size_t arg_len = 0;
        size_t delimited = 0;

        /* skip leading ws */
        while (isspace(*text))
            text++;

        if (*text == '\0')
            break;

        /* gather chars between two unescaped delims */
        for (size_t i=0; i < make_argv_delims_siz; i++) {
            const char c_start = make_argv_delims[i][0];
            const char c_end   = make_argv_delims[i][1];

            if (*text == c_start) {
                arg_len = strchr_unescaped(text, 1, c_end) - 1;
                delimited = 1;
                break;
            }

            /* otherwise gather chars until next unescaped whitespace */
            if (i == make_argv_delims_siz-1) {
                arg_len = strchr_unescaped_ctype(text, 0, isspace);
            }
        }

        if (delimited) {
            text++;
        }

        /* check for buffer overflow */
        if (!dry_run && ((buf_i + arg_len + 1) > buf_siz)) {
            *argv++ = NULL;
            *buf_len = buf_i;
            return 1;
        }

        /* add pointer to argument vector */
        if (!dry_run) *argv++ = buf + buf_i;
        *argv_len += 1;

        /* copy argument over */
        for (size_t i=0; i < arg_len; i++) {
            if (!dry_run) buf[buf_i] = *text;

            buf_i++;
            text++;
        }

        /* null terminate argument */
        if (!dry_run) buf[buf_i] = '\0';

        buf_i++;

        /* skip last delimiter */
        if (delimited) {
            text++;
        }

        /* skip trailing whitespace */
        while (isspace(*text))
            text++;
    }

    /* append the null argument to terminate the argument vector */
    if (!dry_run) *argv++ = NULL;

    *buf_len = buf_i-1;
    return 0;
}

static struct argv_result *
argv_new(const char *text, void *(*new_fun)(size_t size))
{
    struct argv_result *retp = NULL;

    size_t argstr_siz;
    size_t argstr_len;
    size_t argvec_siz;
    size_t argvec_len;

    size_t total_siz;
    uintptr_t align_buf;
    const size_t align_pad = 16;
    const size_t struct_siz = sizeof(struct argv_result);

    /* dry run to calculate space needed */
    argv_make(text, NULL, 0, &argstr_len, NULL, 0, &argvec_len);
    argstr_siz = (argstr_len+1) * sizeof(char);
    argvec_siz = (argvec_len+1) * sizeof(char*);

    /* No arguments found */
    if (argvec_len == 0 || argstr_len == 0) {
        return NULL;
    }

    /*
     * allocate a buffer big enough to hold result struct, the argument vector
     * of string pointers, and the strings they point to. Also extra padding
     * for alignment.
     */

    total_siz = struct_siz + align_pad + argvec_siz +
                                    align_pad + argstr_siz;

    if (0 == (align_buf = (uintptr_t)new_fun(total_siz))) {
        return NULL;
    }

    assert(0 == (align_buf % align_pad));

    retp = (struct argv_result *)align_buf;

    align_buf += struct_siz;
    while (align_buf % align_pad)
        align_buf++;

    retp->argv = (char**)align_buf;

    align_buf += argvec_siz;
    while (align_buf % align_pad)
        align_buf++;

    /* run argv_make for real and return results */
    argv_make(text, (char*)align_buf, argstr_siz, &argstr_len,
                             retp->argv, argvec_siz, &argvec_len);

    retp->argc = argvec_len;

    return retp;
}

static void
argv_delete(struct argv_result *arg, void (*delete_fun)(void* ptr))
{
    delete_fun(arg);
}

static char*
argv_eat_flag(size_t *argcp, char **argv, const char *flag)
{
    char *flag_result = NULL;
    const size_t argc = *argcp;
    size_t i;

    assert(argv);
    assert(*argv);
    assert(argc);

    /*
     * skips looking at element zero since that's typically the program name.
     * I don't think anyone would rename their program to "--verbose" or "-o"
     * but you never know.
     */
    for (i=1; i < argc; i++) {
        /* look for flag in vector */
        if (0 == strcmp(argv[i], flag)) {
            flag_result = argv[i];
            *argcp -= 1;
        }

        /*
         * If flag has been found, move all elements down 1.
         * Remember that argv[argc] is a valid address and holds NULL. Loop
         * terminates when i>=argc so last loop looks like:
         *      argv[argc-1] = argv[argc];
         */
        if (flag_result) {
            argv[i] = argv[i+1];
        }
    }

    /*
     * this is only needed if user has monkeyed with vector elements and it
     * wasn't NULL terminated, again you never know.
     */
    if (flag_result) {
        argv[argc-0] = NULL;
        argv[argc-1] = NULL;
    }

    /* return pointer to flag, or NULL if not found */
    return flag_result;
}

static char*
argv_eat_option(size_t *argcp, char **argv, const char *flag)
{
    char *option_result = NULL;
    const size_t argc = *argcp;
    size_t i;

    assert(argv);
    assert(*argv);
    assert(argc);

    for (i=1; i < (argc-1); i++) {
        if (0 == strcmp(argv[i], flag)) {
            option_result = argv[i+1];
            *argcp -= 2;
        }

        /*
         * If flag has been found, move all elements down 2.
         * Loop terminates when i>=(argc-1) so last loop looks like:
         *      argv[argc-2] = argv[argc];
         * which means argv[argc-1] hasn't been set to NULL. Doesn't need to
         * be, but I'm not a fan of leaving stuff like that around, so it's
         * nullified after the loop.
         */
        if (option_result) {
            argv[i] = argv[i+2];
        }
    }

    /* clean up end of vector */
    if (option_result) {
        argv[argc-0] = NULL;
        argv[argc-1] = NULL;
        argv[argc-2] = NULL;
    }

    return option_result;
}

