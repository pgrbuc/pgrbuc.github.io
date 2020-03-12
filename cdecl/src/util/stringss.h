#include <assert.h>
#include <ctype.h>
#include <stddef.h>
#include <stdint.h>

static size_t
strchr_unescaped(const char *str, size_t i, char c)
{
    while ((str[i] != '\0') && (str[i] != c || str[i-1] == '\\'))
        i++;
    assert(str[i] == c || str[i] == '\0');
    return i;
}

static size_t
strrchr_unescaped(const char *str, size_t i, char c)
{
    while ((i > 0) && (str[i] != c || str[i-1] == '\\'))
        i--;
    assert(str[i] == c || i == 0);
    return i;
}

static size_t
strchr_unescaped_ctype(const char *str, size_t i, int(*isfun)(int))
{
    while ((str[i] != '\0') && ((!isfun(str[i])) || str[i-1] == '\\'))
        i++;
    assert(isfun(str[i]) || str[i] == '\0');
    return i;
}

static size_t
strrchr_unescaped_ctype(const char *str, size_t i, int(*isfun)(int))
{
    while ((i > 0) && ((!isfun(str[i])) || str[i-1] == '\\'))
        i--;
    assert(isfun(str[i]) || i == 0);
    return i;
}

