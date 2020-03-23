/*******************************************************************************
 ** Lex Prologue                                                             |||
 ******************************************************************************/

%top{
#define _POSIX_C_SOURCE 1

/* TODO
 *
 * - static allocations for argv buffers
 * - normal argument parsing for main pper
 * - this could be neater and have less global-variables
 * - add parameters argc argvs for operation functions
 * - possibly chaining:
 *      1)  one idea could be some syntax, like an empty filename, that treats everything after it as a new
 *          nested file like a pseudo file-break. Then:
 *            <file1.txt>
 *              #INCLUDE_B64 ""#INCLUDE_B64 ""#INCLUDE_CAT "file2.txt"
 *          Would base64 encode file2.txt twice, and everything afterwards in
 *          file1.txt
 *
 *      2)  change the syntax to more closely mimic function calls like
 *              #INCLUDE "file1.txt".base64(a,b).base64(c,d)
 *              #INCLUDE "file1.txt".base64(a,b).base64(c,d)
 *
 * - possibly dynamically load operations
 * - eventually a javascript/wasm front end
 * - this could have a better name
 *
 * - Built-in ops or standard op plugins:
 *      - bash? just straight up call out to the shell
 *      - search and replace
 *      - head, last, init, tail
 *      - public key decryption, private key encryption
 *      - c formatter / (obfuscator?) / (deobfuscator??)
 *      - wget
 *      - cpp
 *      - xxd
 *      - shuffle lines
 *
 * - #INCLUDE would bug out a syntax highlighting editor in most languages,
 *   maybe support some end-of-line comment starters like //, --, or "
 *
 */

#define LEX_ERROR               0x00
#define LEX_EOF                 0x01
#define LEX_INCLUDE_NONE        0x02
#define LEX_INCLUDE_FILE        0x04
#define LEX_INCLUDE_ARGS        0x08
#define LEX_INCLUDE_ARGS_FILE   0x10

#define LEX_INCLUDE_RESULT  ( \
    LEX_INCLUDE_NONE        | \
    LEX_INCLUDE_FILE        | \
    LEX_INCLUDE_ARGS        | \
    LEX_INCLUDE_ARGS_FILE   )

}

/*******************************************************************************
 ** Lex Patterns                                                             |||
 ******************************************************************************/

%option noyywrap

FILE_EMPTY  \"([[:space:]])*\"
FILE        \"(\\.|[^\\"])+\"
ARGS        <(\\.|[^\\>])+>
ARGS_EMPTY  <([[:space:]])*>

S           [[:space:]]*

INCLUDE_ME  "#"[[:space:]]*"INCLUDE_ME"

/*******************************************************************************
 ** Lex Rules                                                                |||
 ******************************************************************************/

%%

<<EOF>>                                     { return LEX_EOF; }

{INCLUDE_ME}{S}{FILE_EMPTY}                 { return LEX_INCLUDE_NONE; }
{INCLUDE_ME}{S}{ARGS_EMPTY}{S}{FILE_EMPTY}  { return LEX_INCLUDE_NONE; }

{INCLUDE_ME}{S}{FILE}                       { return LEX_INCLUDE_FILE; }
{INCLUDE_ME}{S}{ARGS_EMPTY}{S}{FILE}        { return LEX_INCLUDE_FILE; }

{INCLUDE_ME}{S}{ARGS}{S}                    { return LEX_INCLUDE_ARGS; }
{INCLUDE_ME}{S}{ARGS}{S}{FILE_EMPTY}        { return LEX_INCLUDE_ARGS; }

{INCLUDE_ME}{S}{ARGS}{S}{FILE}              { return LEX_INCLUDE_ARGS_FILE; }

%%

/*******************************************************************************
 ** C Code                                                                   |||
 ******************************************************************************/

#define MAX_INCLUDE_DEPTH   10
#define MAX_FILEPATH        1024

#define MAX_ARG_LENGTH      128
#define MAX_ARG_CT          10

#include "prepi.h"

#define main cat_main
#include "cat.c"
#undef main

#define main b64_main
#include "base64.c"
#undef main

typedef YY_BUFFER_STATE lex_buffer_state_t;
typedef void(*op_fun_t)(int, char**, FILE*, FILE*);

typedef struct {
    FILE *in;
    FILE *tmp;
    lex_buffer_state_t in_bufstate;
    op_fun_t op;
    char **argv;
    uint argc;
} file_t;

global const char *IncludePath;
global const char *CurrentPath;
global const char *DefaultArgumentString = "cat";

internal void
lexer_switch_active_file(FILE *in, FILE *out, lex_buffer_state_t bufstate)
{
    yyin  = in;
    yyout = out;
    yy_switch_to_buffer(bufstate);
}

/*******************************************************************************
 ** Operations                                                               |||
 ******************************************************************************/
op_fun_t
op_from_str(const char *text)
{
    if (0 == strcmp(text, "base64")) return base64;
    if (0 == strcmp(text, "cat"))    return cat;
    return cat;
}

uint
op_init(file_t *fil, uint lexer_result) {
    switch (lexer_result) {
        case LEX_INCLUDE_NONE:      fil->op = cat; return 0;
        case LEX_INCLUDE_FILE:      fil->op = cat; return 0;
        case LEX_INCLUDE_ARGS:      fil->op = op_from_str(fil->argv[0]); return 0;
        case LEX_INCLUDE_ARGS_FILE: fil->op = op_from_str(fil->argv[0]); return 0;
        default: return 1;
    }
}

/*******************************************************************************
 ** Parsers                                                                  |||
 ******************************************************************************/

internal void
parse_filename(char *res, char const *text)
{
    const uint end = strrchr_unescaped(text, strlen(text), '"');

    if (text[end] == '"') {
        const uint start = strrchr_unescaped(text, end-1, '"');
        const uint first = start + 1;

        for (uint i=first; i<end; i++)
            *res++ = text[i];
    }
    *res++ = '\0';
    return;
}

internal void
parse_argstr(char *res, char const *text)
{
    uint len=0;
    const uint start = strchr_unescaped(text, 0, '<');

    if (text[start] == '<') {
        const uint first = start + 1;
        const uint end = strchr_unescaped(text, first, '>');

        for (uint i=first; i<end; i++) {
            res[len++] = text[i];
        }
    }
    res[len] = '\0';

    return;
}

/*******************************************************************************
 ** Include File Stack                                                       |||
 ******************************************************************************/

internal int
file_init(file_t *new, char *filepath, char *argument_str)
{
    char path1[1024];
    char path2[1024];
    char *in_path;

    /* TODO check overflows */
    /* TODO replace this with a vector of directories to try */
    strcpy(path1, IncludePath);
    strcat(path1, filepath);

    strcpy(path2, CurrentPath);
    strcat(path2, filepath);

    if (NULL != (new->in = fopen(path1, "rb" ))) {
        in_path = path1;
    } else if (NULL != (new->in = fopen(path2, "rb" ))) {
        in_path = path2;
    } else {
        debugf("file_init couldn't open: '%s'", filepath);
        return 1;
    }

    if (NULL == (new->tmp = tmpfile())) {
        fclose(new->in);
        debugf("couldn't make temp file for: '%s'", in_path);
        return 1;
    }

    new->in_bufstate = yy_create_buffer(new->in, YY_BUF_SIZE);

    if (0 != (argv_new(argument_str, &new->argv, &new->argc, malloc))) {
        fclose(new->tmp);
        fclose(new->in);
        debugf("couldn't parse args: '%s'", argument_str);
    }

    return 0;
}

internal void
file_destroy(file_t *new)
{
    if (NULL != new->in) {
        fclose(new->in);
        new->in = NULL;
    }

    if (NULL != new->tmp) {
        fclose(new->tmp);
        new->tmp = NULL;
    }

    yy_delete_buffer(new->in_bufstate);
    argv_delete(new->argv, free);
    new->argv = NULL;
    return;
}

/*******************************************************************************
 ** Main                                                                     |||
 ******************************************************************************/

internal int
loop(char *parent)
{
    local_persist uint include_depth = 0;
    FILE *current_in  = yyin;
    FILE *current_out = yyout;
    lex_buffer_state_t current_buffer = YY_CURRENT_BUFFER;

    debugf("%s START", parent);
    include_depth++;

    while (1) {
        file_t new = {0};
        char filename[YY_BUF_SIZE];
        char argument[YY_BUF_SIZE];
        int res;

        res = yylex();

        /* base case */
        if ((res == LEX_ERROR) || (res == LEX_EOF)) {
            debugf("%s END", parent);
            include_depth--;
            return 0;
        }

        /* set up for recursive call */
        {
            parse_filename(filename, yytext);
            parse_argstr(argument, yytext);

            if (0 == strlen(argument))
                strcpy(argument, DefaultArgumentString);

            if (0 != file_init(&new, filename, argument)) {
                debugf("[ %s ] < %s > couldn't open file", filename, argument);
                /* leave the include directive in */
                /* TODO maybe this should abort? */
                fputs(yytext, current_out);
                continue;
            }

            if (0 != op_init(&new, res)) {
                debugf("[ %s ] < %s > couldn't load plugin", filename, argument);
            }

            lexer_switch_active_file(new.in, new.tmp, new.in_bufstate);
        }

        /* recursive call */
        if (0 != loop(filename)) {
            debugf("[ %s ] < %s > loop return error", filename, argument);
        }

        /*
         * The entire file from the include statement has been fully
         * read into a file and can be operated over and then appended at the
         * end of the current output.
         */
        rewind(new.tmp);
        new.op(new.argc, new.argv, new.tmp, current_out);

        file_destroy(&new);
        /* switch back and continue parsing file */
        lexer_switch_active_file(current_in, current_out, current_buffer);
    }
}

int
main(int argc, char **argv)
{
    /*
     * TODO this should have a more normal arguments ie.
     * - search directories are pos-independent options "-Idir" or "-I dir"
     *
     * - input and output are pos-dependant and looked at after consuming all
     *   flags and options
     *
     * - ./includer infile [[-o] outfile]
     */
    char const * arg_progname = argv[0];
    char const * arg_dirname  = argv[1];
    char const * arg_inname   = argv[2];
    char const * arg_outname  = argv[3];
    char const * dirname = argc >= 2 ? arg_dirname : "./";
    char const * inname  = argc >= 3 ? arg_inname  : "-";
    char const * outname = argc >= 4 ? arg_outname : "-";
    char const dir_slash = dirname[strlen(dirname)-1];

    /* check args */
    if (argc > 4)
        abortf("usage %s [INCLUDE_DIR] [INCLUDE_FILE] [OUTPUT_FILE]", arg_progname);

    if (dir_slash != '/' && dir_slash != '\\')
        abortf("directory name must have trailing slash: '%s'", dirname);

    CurrentPath = "./";
    IncludePath = dirname;

    /* build first string that will kickstart the lexer */
    {
        char kickstart[YY_BUF_SIZE];
        char const * const fmt = "#INCLUDE_ME <cat -o \"%s\"> \"%s\"";

        if (YY_BUF_SIZE < (snprintf(0, 0, fmt, outname, inname) + 1))
            abortf("filenames too long to include: '%s' '%s'", outname, inname);

        snprintf(kickstart, YY_BUF_SIZE, fmt, outname, inname);
        yy_scan_string(kickstart);
    }

    lex_buffer_state_t kickstart_state;

    kickstart_state = YY_CURRENT_BUFFER;

    yyout = stdout;
    loop("<root>");

    yy_delete_buffer(kickstart_state);

    return 0;
}

