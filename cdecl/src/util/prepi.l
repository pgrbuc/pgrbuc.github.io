/*******************************************************************************
 ** Lex Prologue                                                             |||
 ******************************************************************************/

%top{
#define _POSIX_C_SOURCE 1

#define LEX_ERROR           0x00
#define LEX_EOF             0x01

#define LEX_INCLUDE_ME      0x02
#define LEX_INCLUDE_ME_ARGS 0x04

#define LEX_INCLUDE_RESULT  (LEX_INCLUDE_ME | LEX_INCLUDE_ME_ARGS)

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
}

/*******************************************************************************
 ** Lex Patterns                                                             |||
 ******************************************************************************/

%option noyywrap

FILE        \"(\\.|[^\\"])+\"
ARG_STR     <(\\.|[^\\>])+>
S           [[:space:]]*
ARG_BEG     <
ARG_END     >

INCLUDE_ME  "#"[[:space:]]*"INCLUDE_ME"

/*******************************************************************************
 ** Lex Rules                                                                |||
 ******************************************************************************/

%%

<<EOF>> { return LEX_EOF; }
{INCLUDE_ME}{S}{FILE} { return LEX_INCLUDE_ME; }
{INCLUDE_ME}{S}{ARG_BEG}{S}{ARG_END}{S}{FILE} { return LEX_INCLUDE_ME; }
{INCLUDE_ME}{S}{ARG_STR}{S}{FILE} { return LEX_INCLUDE_ME_ARGS; }

%%

/*******************************************************************************
 ** C Code                                                                   |||
 ******************************************************************************/

#define MAX_INCLUDE_DEPTH   10
#define MAX_FILEPATH        1024

#define MAX_ARG_LENGTH      128
#define MAX_ARG_CT          10

#include "stringss.h"
#include "argv_make.h"
#include "prepi.h"

#define main cat_main
#include "cat.c"
#undef main

#define main b64_main
#include "base64.c"
#undef main

typedef YY_BUFFER_STATE lex_buffer_state_t;
typedef void(*op_fun_t)(FILE*, FILE*);

typedef struct {
    FILE *in;
    FILE *tmp;
    char in_path[MAX_FILEPATH];
    lex_buffer_state_t in_bufstate;
    op_fun_t op;
    struct argv_result *arg;
} file_t;

global char IncludePath[MAX_FILEPATH];

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

internal void
parse_argstr(char *res, char const *text)
{
    const uint start = strchr_unescaped(text, 0, '<');

    if (text[start] == '<') {
        const uint first = start + 1;
        const uint end = strchr_unescaped(text, first, '>');

        for (uint i=first; i<end; i++)
            *res++ = text[i];
    }
    *res++ = '\0';
    return;
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

    if (file_stack_p == 0) {
        abortf("%s", "file stack underrun");
    }

    fil = &file_stack[file_stack_p--];

    if (fil->in) {
        fclose(fil->in);
        fil->in = NULL;
    }

    if (fil->tmp) {
        fclose(fil->tmp);
        fil->tmp = NULL;
    }

    if (fil->arg) {
        argv_delete(fil->arg, free);
        fil->arg = NULL;
    }

    yy_delete_buffer(fil->in_bufstate);
}

internal int
file_init(file_t *new, char *filepath, char *argument_str)
{
    /* TODO check overflows */
    strcpy(new->in_path, IncludePath);
    strcat(new->in_path, filepath);

    if (NULL == (new->in = fopen(new->in_path, "r" ))) {
        debugf("couldn't open: '%s'", new->in_path);
        return 1;
    }

    if (NULL == (new->tmp = tmpfile())) {
        fclose(new->in);
        debugf("couldn't make temp file for: '%s'", new->in_path);
        return 1;
    }

    /* TODO can this fail? */
    new->in_bufstate = yy_create_buffer(new->in, YY_BUF_SIZE);

    if (NULL == (new->arg = argv_new(argument_str, malloc))) {
        fclose(new->tmp);
        fclose(new->in);
        debugf("couldn't parse args: '%s'", argument_str);
    }

    return 0;
}

internal void
file_activate(file_t *fil)
{
    yyin  = fil->in;
    yyout = fil->tmp;

    yy_switch_to_buffer(fil->in_bufstate);
}

internal void
load_directory_name(char const * const arg_dirname)
{
    /*
     * adds '/' directory seperator if argument not passed with one
     */
    const uint min_filename_len = 1;
    const uint dirname_len = strlen(arg_dirname);
    const uint no_seperator = arg_dirname[dirname_len-1] != '/';
    const uint max = ((MAX_FILEPATH-1) - min_filename_len) - no_seperator;

    if (dirname_len >= max)
        abortf("Directory too long ('%s' exceeds size %d)", arg_dirname, MAX_FILEPATH);

    strcpy(IncludePath, arg_dirname);

    if (no_seperator) {
        strcat(IncludePath, "/");
    }
}

/*******************************************************************************
 ** Main                                                                     |||
 ******************************************************************************/


int
loop(void)
{
    int res = yylex();
    char text_bak[YY_BUF_SIZE];
    strcpy(text_bak, yytext);

    file_t *current = &file_stack[file_stack_p];
    file_t *parent = (file_stack_p > 0) ? current-1 : NULL;

    if (res & LEX_INCLUDE_RESULT) {
        file_t *fil;
        char filename_str[YY_BUF_SIZE];
        char argument_str[YY_BUF_SIZE];

        parse_filename(filename_str, yytext);
        parse_argstr(argument_str, yytext);

        fil = file_stack_new();
        if (0 != file_init(fil, filename_str, argument_str)) {
            debugf("couldn't proccess file: '%s'", yytext);
            file_stack_delete();
            fputs(yytext, current->tmp);
        } else {
            debug_padf(file_stack_p, "%s START", fil->in_path);
            file_activate(fil);
            switch (res) {
                case LEX_INCLUDE_ME:      fil->op = cat;    break;
                case LEX_INCLUDE_ME_ARGS: fil->op = op_from_str(fil->arg->argv[0]); break;
                default: break;
            }
        }
    } else if (res == LEX_EOF) {
        rewind(current->tmp);

        if (parent == NULL) {
            cat_ignore_trailing_newline = 0;
            cat(current->tmp, stdout);
            return 0;
        } else {
            current->op(current->tmp, parent->tmp);
            debug_padf(file_stack_p, "%s DONE", current->in_path);
            file_stack_delete();
            debug_padf(file_stack_p, "  %s RESUME", parent->in_path);
            file_activate(parent);
        }
    } else {
        debugf("Unhandled op: %d", res);
        return 0;
    }

    return 1;
}

int
main(int argc, char **argv)
{
    char * const arg_progname = argv[0];
    char * const arg_dirname  = argv[1];
    char * const arg_filename = argv[2];

    file_t *fil = file_stack_new();

    if (argc != 3) {
        abortf("usage %s INCLUDE_DIR INCLUDE_FILE", arg_progname);
    }

    if (0 == strcmp(arg_filename, "-")) {
        fil->in = stdin;
        strcpy(fil->in_path, "<stdin>");
    } else {
        if (NULL == (fil->in = fopen(arg_filename, "rb"))) {
            abortf("unable to open file '%s'", arg_filename);
        }
        strcpy(fil->in_path, arg_filename);
    }

    fil->tmp = tmpfile();
    fil->in_bufstate = yy_create_buffer(fil->in, YY_BUF_SIZE);
    fil->op = cat;
    file_activate(fil);

    load_directory_name(arg_dirname);

    cat_ignore_trailing_newline = 1;

    debugf("%s START", fil->in_path);

    while (0 != loop())
        ;

    debugf("%s END", fil->in_path);

    return 0;
}

