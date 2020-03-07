
%top{

#define _POSIX_C_SOURCE 200112L
#include "prepi.h"

#if 1
    #define debugf(fmt, ...) fprintf(stderr, fmt"\n", __VA_ARGS__)
#else
    #define debugf(fmt, ...)
#endif

#define abortf(fmt, ...) (fprintf(stderr, "Fatal Error: "fmt"\n", __VA_ARGS__), abort())


#define main catmain
#include "cat.c"
#undef main

#define main b64main
#include "base64.c"
#undef main

#define YY_BUF_SIZE BUFFER_SIZE
#define MAX_INCLUDE_DEPTH 10
#define MAX_FILEPATH    1024

}

%{

enum op { CAT=0, B64 };
enum lex { LEX_ERROR=-1, LEX_EOF, LEX_INCLUDE};
typedef void(*op_fun_t)(FILE*, FILE*);

typedef struct {
    FILE *in;
    FILE *tmp;
    YY_BUFFER_STATE buf;
    char path[MAX_FILEPATH];
    op_fun_t op;
} file_t;

global char IncludePath[MAX_FILEPATH];

/*******************************************************************************
 ** Include File Stack                                                       |||
 ******************************************************************************/

file_t file_stack[MAX_INCLUDE_DEPTH];
int file_stackp = 0;
#define curfile    (file_stack + file_stackp)
#define parentfile (file_stackp ? (file_stack + file_stackp - 1) : NULL)

int file_push_new(char *filepath) {
    file_t new;
    strcpy(new.path, IncludePath);
    strcat(new.path, filepath);

    if (NULL == (new.in = fopen(new.path, "r" ))) {
        debugf("couldn't open: '%s'", new.path);
        return 1;
    }

    if (NULL == (new.tmp = tmpfile())) {
        debugf("couldn't make temp file for: '%s'", new.path);
        return 1;
    }

    new.buf = yy_create_buffer(new.in, YY_BUF_SIZE);

    if (file_stackp == (MAX_INCLUDE_DEPTH-1)) {
        abortf("Too many nested includes (MAX %d)", MAX_INCLUDE_DEPTH);
    }

    file_stackp++;

    *curfile = new;

    return 0;
}

void file_pop(void)  {
    if (file_stackp == 0) {
        abortf("%s", "file stack underrun");
    }
    file_stackp--;
}

void file_set(void) {
    debugf("lexing start: '%s'", curfile->path);
    yyin  = curfile->in;
    yyout = curfile->tmp;
    yy_switch_to_buffer(curfile->buf);
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

int lex_include_hit(op_fun_t op) {
    char str[MAX_FILEPATH];

    uint start = 0;
    do { ; } while (yytext[start++] != '"');
    strcpy(str, yytext+start);
    str[strlen(str)-1] = '\0';

    if (0 != file_push_new(str)) {
        debugf("couldn't proccess file: '%s'", str);
        return 1;
    }

    curfile->op = op;

    return 0;
}

%}

/*******************************************************************************
 ** Lex Patterns                                                             |||
 ******************************************************************************/

%option noyywrap

FILE    \"(\\.|[^"\\])+\"
CAT_INCLUDE "#"[[:space:]]*"CAT_INCLUDE"[[:space:]]*
B64_INCLUDE "#"[[:space:]]*"B64_INCLUDE"[[:space:]]*

/*******************************************************************************
 ** Lex Rules                                                                |||
 ******************************************************************************/

%%

<<EOF>> {
    return LEX_EOF;
}

{CAT_INCLUDE}{FILE} {
    if (0 != lex_include_hit(cat)) REJECT;
    return LEX_INCLUDE;
}

{B64_INCLUDE}{FILE} {
    if (0 != lex_include_hit(base64)) REJECT;
    return LEX_INCLUDE;
}

%%

/*******************************************************************************
 ** Main                                                                     |||
 ******************************************************************************/
int loop() {
    while (1) {
        int res = yylex();
        if (res == LEX_INCLUDE) {
            debugf("Include HIT: '%s'", curfile->path);
            file_set();
        } else if (res == LEX_EOF) {
            rewind(curfile->tmp);

            if (parentfile == NULL) {
                cat_ignore_trailing_newline = 0;
                cat(curfile->tmp, stdout);
                return 0;
            } else {
                curfile->op(curfile->tmp, parentfile->tmp);
                fclose(curfile->tmp);
                yy_delete_buffer(curfile->buf);
                file_pop();
                file_set();
            }
        } else {
            return 0;
        }
    }
    return 0;
}

int main(int argc, char **argv) {
    char *arg_dirname  = argv[1];
    char *arg_filename = argv[2];

    if (argc >= 3) {
        if (NULL == (curfile->in = fopen(arg_filename, "rb"))) {
            abortf("unable to open file '%s'", arg_filename);
        }
        strcpy(curfile->path, arg_filename);
    } else if (argc >= 2) {
        curfile->in = stdin;
        strcpy(curfile->path, "<stdin>");
    } else {
        abortf("usage %s INCLUDE_DIR [INCLUDE_FILE]", argv[0]);
    }

    curfile->tmp = tmpfile();
    curfile->buf = yy_create_buffer(curfile->in, YY_BUF_SIZE);
    curfile->op = CAT;

    load_directory_name(arg_dirname);
    cat_ignore_trailing_newline = 1;

    file_set();

    loop();
    return 0;
}

