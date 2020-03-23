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
            return -1;
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

static int
argv_new(const char *text, char ***argvp, size_t *argcp, void *(*new_fun)(size_t size))
{
    size_t argstr_siz;
    size_t argstr_len;
    void  *argstr_buf;

    size_t argvec_siz;
    size_t argvec_len;
    void  *argvec_buf;

    size_t total_siz;
    uintptr_t aligned_addr;
    const size_t align_pad = 16;

    /* dry run to calculate space needed */
    argv_make(text, NULL, 0, &argstr_len, NULL, 0, &argvec_len);
    argstr_siz = (argstr_len+1) * sizeof(char);
    argvec_siz = (argvec_len+1) * sizeof(char*);

    /* No arguments found */
    if (argvec_len == 0 || argstr_len == 0) {
        return -1;
    }

    /*
     * allocate a buffer big enough to hold result struct, the argument vector
     * of string pointers, and the strings they point to. Also extra padding
     * for alignment.
     */
    total_siz = argvec_siz + align_pad + argstr_siz;
    if (0 == (aligned_addr = (uintptr_t)new_fun(total_siz))) {
        return -1;
    }

    assert(0 == (aligned_addr % align_pad));
    argvec_buf = (void*)aligned_addr;

    aligned_addr += argvec_siz;
    while (aligned_addr % align_pad)
        aligned_addr++;

    assert(0 == (aligned_addr % align_pad));
    argstr_buf = (void*)aligned_addr;

    /* run argv_make for real and return results */
    argv_make(text, argstr_buf, argstr_siz, &argstr_len,
                    argvec_buf, argvec_siz, &argvec_len);

    *argvp = argvec_buf;
    *argcp = argvec_len;

    return 0;
}

static void
argv_delete(char **argv, void (*delete_fun)(void* ptr))
{
    delete_fun(argv);
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
        if (!flag_result && (0 == strcmp(argv[i], flag))) {
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
        if (!option_result && (0 == strcmp(argv[i], flag))) {
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

static int
argv_is_prefix_of(char const *flag, char const *arg)
{
    size_t i;
    const size_t flag_len = strlen(flag);
    const size_t arg_len  = strlen(arg);

    const size_t end_len  = arg_len > flag_len ? 0 : arg_len - flag_len;

    for (i=0; i<flag_len; i++) {
        if (i >= end_len)
            return 0;
        if (flag[i] != arg[i])
            return 0;
    }
    return 1;
}

static char*
argv_eat_combo_flag(size_t *argcp, char **argv, const char *flag)
{
    char *flag_result = NULL;
    const size_t argc = *argcp;
    size_t i;

    assert(argv);
    assert(*argv);
    assert(argc);

    for (i=1; i < argc; i++) {
        if (!flag_result && argv_is_prefix_of(flag, argv[i])) {
            flag_result = argv[i] + strlen(flag);
            *argcp -= 1;
        }

        if (flag_result) {
            argv[i] = argv[i+1];
        }
    }

    if (flag_result) {
        argv[argc-0] = NULL;
        argv[argc-1] = NULL;
    }

    return flag_result;
}

