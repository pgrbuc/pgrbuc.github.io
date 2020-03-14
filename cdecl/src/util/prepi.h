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

    #define debug_padf(n, fmt, ...)                 \
    do {                                            \
        for (uint i=0; i<(((uint)n)*4); i++) {      \
            fputc(' ', stderr);                     \
        }                                           \
        fprintf(stderr, fmt"\n", __VA_ARGS__);      \
    } while (0)

#else
    #define debugf(fmt, ...)
    #define debugf_no_newln(fmt, ...)
    #define debug_padf(n, fmt, ...)
#endif

#define abortf(fmt, ...) \
    (fprintf(stderr, fmt"\n", __VA_ARGS__), abort())

#define perrorf(fmt, ...) \
    (fprintf(stderr, fmt"\n", __VA_ARGS__), perror(""))

#define STATIC_ARRAY_LEN(x) ((sizeof(x))/(sizeof(*(x))))

#endif


