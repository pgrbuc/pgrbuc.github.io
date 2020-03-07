#ifndef PREPI_H
#define PREPI_H

#include <stdio.h>
#include <stdint.h>

#define global
#define local_persist static
#define internal static

typedef unsigned char uchar;
typedef uint_fast32_t uint;
enum const_vals {
    BUFFER_SIZE = 4096,
    INBUFFER  = BUFFER_SIZE * 3,
    OUTBUFFER = BUFFER_SIZE * 4,
};

#endif

