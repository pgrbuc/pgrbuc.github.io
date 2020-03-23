#ifndef PREPI_H
#define PREPI_H

#include "stringss.h"
#include "argv_make.h"

#include <assert.h>
#include <ctype.h>
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>

#include <stdio.h>

#define global
#define local_persist static
#define internal static

typedef unsigned char uchar;
typedef size_t uint;

#if (1) && (!defined NDEBUG)
    #define debugf(fmt, ...) \
        (fprintf(stderr, fmt"\n", __VA_ARGS__))

    #define debugf_no_newln(fmt, ...) \
        (fprintf(stderr, fmt, __VA_ARGS__))

#else
    static int debugf(char *fmt, ...) {
        (void) fmt;
        return 0;
    }
    static int debugf_no_newln(char *fmt, ...) {
        (void) fmt;
        return 0;
    }
#endif

#define abortf(fmt, ...) \
    (fprintf(stderr, fmt"\n", __VA_ARGS__), abort())

#define perrorf(fmt, ...) \
    (fprintf(stderr, fmt"\n", __VA_ARGS__), perror(""))

#define STATIC_ARRAY_LEN(x) ((sizeof(x))/(sizeof(*(x))))

#endif


