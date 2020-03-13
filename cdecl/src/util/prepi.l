/*******************************************************************************
 ** Lex Prologue                                                             |||
 ******************************************************************************/

%top{
#define _POSIX_C_SOURCE 1

/* TODO
 * syntax ideas
 *      A)
 *          #INCLUDE_ME <cat arg1> "test.txt"
 *          #INCLUDE_ME <base64 arg1> "test.txt"
 *          #INCLUDE_ME <base64> "test.txt"
 *          #INCLUDE_ME <base64 arg1 | cat arg2> "test.txt"
 *
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
    char in_path[MAX_FILEPATH];
    lex_buffer_state_t in_bufstate;
    op_fun_t op;
    struct argv_result *arg;
} file_t;

global const char *IncludePath;
global const char *CurrentPath;

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

internal uint
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
    return len;
}

/*******************************************************************************
 ** Include File Stack                                                       |||
 ******************************************************************************/

file_t file_stack[MAX_INCLUDE_DEPTH];
int file_stack_p = -1;

file_t *
file_stack_new(void)
{
    file_t *fil;

    if (file_stack_p == (MAX_INCLUDE_DEPTH-1)) {
        abortf("Too many nested includes (MAX %d)", MAX_INCLUDE_DEPTH);
    }

    fil = &file_stack[++file_stack_p];

    return fil;
}

void
file_stack_delete(void)
{
    file_t *fil;

    if (file_stack_p < 0)
        abortf("%s", "file stack underrun");

    fil = &file_stack[file_stack_p--];

    if (fil->in)
        fclose(fil->in);

    if (fil->tmp)
        fclose(fil->tmp);

    if (fil->arg)
        argv_delete(fil->arg, free);

    yy_delete_buffer(fil->in_bufstate);
    memset(fil, 0, sizeof(*fil));
}

internal int
file_init(file_t *new, char *filepath, char *argument_str)
{
    char path1[1024];
    char path2[1024];
    /* TODO check overflows */
    if ('\0' == new->in_path[0]) {
        strcpy(path1, IncludePath);
        strcat(path1, filepath);

        strcpy(path2, CurrentPath);
        strcat(path2, filepath);
    }

    if (NULL == new->in) {
        if (NULL != (new->in = fopen(path1, "rb" ))) {
            strcpy(new->in_path, path1);
        } else if (NULL != (new->in = fopen(path2, "rb" ))) {
            strcpy(new->in_path, path2);
        } else {
            debugf("file_init couldn't open: '%s'", filepath);
            return 1;
        }
    }

    if (NULL == new->tmp) {
        if (NULL == (new->tmp = tmpfile())) {
            fclose(new->in);
            debugf("couldn't make temp file for: '%s'", new->in_path);
            return 1;
        }
    }

    new->in_bufstate = yy_create_buffer(new->in, YY_BUF_SIZE);

    if (NULL == new->arg) {
        if (NULL == (new->arg = argv_new(argument_str, malloc))) {
            fclose(new->tmp);
            fclose(new->in);
            debugf("couldn't parse args: '%s'", argument_str);
        }
    }

    return 0;
}

/*******************************************************************************
 ** Main                                                                     |||
 ******************************************************************************/
char * const DefaultArgumentString = "cat";
internal int
loop(void)
{
    int res = yylex();
    file_t *current = &file_stack[file_stack_p];
    file_t *parent = (file_stack_p > 0) ? current-1 : NULL;
    FILE *dest = (parent == NULL) ? NULL : parent->tmp;

    file_t *fil;
    char filename_strbuf[YY_BUF_SIZE];
    char argument_strbuf[YY_BUF_SIZE];
    char *filename = filename_strbuf;
    char *argument = argument_strbuf;

    /* start unwinding */
    if (res == LEX_EOF) {
        rewind(current->tmp);
        current->op(current->arg->argc, current->arg->argv, current->tmp, dest);
        debug_padf(file_stack_p, "%s DONE", current->in_path);
        file_stack_delete();

        if (parent == NULL) {
            return 1;
        }

        debug_padf(file_stack_p, "  %s RESUME", parent->in_path);
        lexer_switch_active_file(parent->in, parent->tmp, parent->in_bufstate);
        return loop();
    }

    if (0 == (res & LEX_INCLUDE_RESULT)) {
        debugf("Unhandled op: %d", res);
        return 1;
    }

    parse_filename(filename, yytext);
    if (0 == parse_argstr(argument, yytext)) {
        argument = DefaultArgumentString;
    }

    fil = file_stack_new();

    if (0 != file_init(fil, filename, argument)) {
        debugf("couldn't proccess file: '%s'", yytext);
        file_stack_delete();
        /* put rejected text into output */
        fputs(yytext, current->tmp);
    } else {
        debug_padf(file_stack_p, "%s START", fil->in_path);
        lexer_switch_active_file(fil->in, fil->tmp, fil->in_bufstate);
        switch (res) {
            case LEX_INCLUDE_FILE:      fil->op = cat;    break;
            case LEX_INCLUDE_ARGS:      fil->op = op_from_str(fil->arg->argv[0]); break;
            case LEX_INCLUDE_ARGS_FILE: fil->op = op_from_str(fil->arg->argv[0]); break;
            default: break;
        }
    }

    return loop();
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
    char const * const arg_progname = argv[0];
    char const * const arg_dirname  = argv[1];
    char const * const arg_inname   = argv[2];
    char const * const arg_outname  = argv[3];
    char const * const dirname = argc >= 2 ? arg_dirname : "./";
    char const * const inname  = argc >= 3 ? arg_inname  : "-";
    char const * const outname = argc >= 4 ? arg_outname : "-";
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

    debugf("LEXER START: '%s'", yytext);
    kickstart_state = YY_CURRENT_BUFFER;

    loop();

    yy_delete_buffer(kickstart_state);
    debugf("%s", "LEXER END");

    return 0;
}

