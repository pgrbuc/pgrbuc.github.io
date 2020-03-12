#include "prepi.h"

/*******************************************************************************
 ** Base 64 encoder                                                          |||
 ******************************************************************************/

global void
base64(FILE *in, FILE *out)
{
    /*
     * Base64 encoding takes 8-bit octets and outputs them as ascii letters
     * that represents 6-bit sextets.
     *
     * If the number of input octets are a round multiple of three, then the
     * number of output sextets is a round multiple of four since:
     *
     *      3octets  * 8bits = 24bits_total
     *      4sextets * 6bits = 24bits_total
     *
     * Knowing the output size is a fixed percent of the input size, and
     * setting the buffer sizes appropriately allows the innermost loop of
     * this function to not worry about filling, overflowing, or flushing the
     * output buffer.
     *
     */

    enum const_vals {
        BUFFER_SIZE = 4096,
        INBUFFER  = BUFFER_SIZE * 3,
        OUTBUFFER = BUFFER_SIZE * 4,
    };

    local_persist uchar input_buffer[INBUFFER+2];
    local_persist uchar output_buffer[OUTBUFFER];

    local_persist uchar lookup[] = {
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
        'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
        'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
        'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
        'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
        'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
        'w', 'x', 'y', 'z', '0', '1', '2', '3',
        '4', '5', '6', '7', '8', '9', '+', '/',
    };

    while (!(feof(in) || ferror(in))) {
        uint len;
        uint output_len;

        len = fread(input_buffer, 1, INBUFFER, in);

        /*
         * One catch is that if the number of input octets isn't a round
         * multiple of three, then the number of output sextets isn't a round
         * multiple of four. Base64 specifies that the number of encoded
         * sextets be a round multiple of four where:
         *
         *  A)  partial sextets that only have 4 or 2 bits from the input
         *      octets have the remaining of their lsb's zeroed.
         *
         *  B)  sextets that have don't have any bits from input octets
         *      are encoded as the letter "=" as padding.
         *
         *              MSB  0 .......8   ......16   ......24  LSB
         *      3octets:       xxxxxxxx   yyyyyyyy   zzzzzzzz
         *      4sextets:      xxxxxx  xxyyyy  yyyyzz  zzzzzz
         *              MSB  0 .....6  ....12  ....18  ....24  LSB
         *
         *              MSB  0 .......8   ......16   ......24  LSB
         *      2octets:       xxxxxxxx   yyyyyyyy   --------
         *      4sextets:      xxxxxx  xxyyyy  yyyy00  <pad=>
         *              MSB  0 .....6  ....12  ....18  ....24  LSB
         *
         *              MSB  0 .......8   ......16   ......24  LSB
         *      1octets:       xxxxxxxx   --------   --------
         *      4sextets:      xxxxxx  xx0000  <pad=>  <pad=>
         *              MSB  0 .....6  ....12  ....18  ....24  LSB
         *
         * Instead of writing different expressions inside the innermost loop
         * to encode the four sextets differently depending on how many octets
         * were read, this function uses the same expression for all cases.
         *
         * This works because it zeros out a few trailing input octets past
         * the ones that are read so that the partial sextets are encoded
         * correctly, and because the number of valid sextets and the number
         * of padding sextets are known.
         *
         * Essentially it is ok for the innermost loop to generate a few extra
         * sextets because we were already only going to print up to the last
         * valid one, then print padding sextets.
         */

        input_buffer[len] = 0;
        input_buffer[len+1] = 0;

        switch (len % 3) {
          case 1:
            output_len = ((len+2)*4)/3;
            output_len -= 2; /* adjusted for the 2 pad chars later */
            break;
          case 2:
            output_len = ((len+1)*4)/3;
            output_len -= 1; /* adjusted for the 1 pad char later */
            break;
          default:
            output_len = ((len+0)*4)/3;
            break;
        }

        /*
         * One last thing, instead of looping over n input octets, the
         * innermost loop a constant number of times every time.
         *
         * The idea was that maybe the compiler would have more options for
         * for loop unrolling or auto-vectorization, and maybe having one path
         * for the innermost loop would help with branch prediction misses.
         */

        for (uint i=0; i < BUFFER_SIZE; i++) {
            const uint j   = i*3;
            const uint k   = i*4;
            const uint byt = ((input_buffer[j+0] << 16) | (input_buffer[j+1] << 8) | (input_buffer[j+2]));

            output_buffer[k+0] = lookup[(byt >> 18) & 0x3f];
            output_buffer[k+1] = lookup[(byt >> 12) & 0x3f];
            output_buffer[k+2] = lookup[(byt >>  6) & 0x3f];
            output_buffer[k+3] = lookup[(byt >>  0) & 0x3f];
        }

        /*
         * Pad output to be divisible by four and flush.
         */
        while ((output_len % 4) != 0) {
            output_buffer[output_len++] = '=';
        }

        fwrite(output_buffer, 1, output_len, out);
    }

    return;
}

/*******************************************************************************
 ** Main                                                                     |||
 ******************************************************************************/

global int
base64_plugin_main(int argc, char **argv, FILE *in, FILE *out)
{
    (void)argc; (void)argv;
    //if (argc >= 2) {
    //    if (NULL == (in = fopen(argv[1], "r"))) {
    //        perrorf("Couldn't open file '%s': ", argv[1]);
    //        return 0;
    //    }
    //}

    setvbuf(in, NULL, _IONBF, 0);
    setvbuf(out, NULL, _IONBF, 0);

    base64(in, out);
    return 0;
}

global int
main(int argc, char **argv) {
    return base64_plugin_main(argc, argv, stdin, stdout);
}

