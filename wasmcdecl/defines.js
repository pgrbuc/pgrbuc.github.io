const helpContents =
`Type in other text area to begin

Type 'help' or '?' to print cdecl's built in help prompt

-------- Examples --------

 - explain int*(*x)(int)
    declare x as pointer to function (int) returning pointer to int

 - declare x as static const pointer to volatile int
    static volatile int * const x

 - declare fp as pointer to function(int) returning pointer to array 16 of int
    int (*(*fun)(int ))[16]

 - declare fp as ptr to func(int) returning ptr to array 16 of int
    int (*(*fun)(int ))[16]

-------- Grammar Hints --------

Remember cdecl only recognizes text in the following forms:
    declare ____ as
    __ pointer to __
    __ function returning __
    __ array of __
    __ array 16 of __
`;

const aboutContents = `
#########################
##        CDECL        ##
#########################
Originally written by
    Graham Ross

Improved and expanded by
    David Wolverton
    Tony Hanse
    and Merlyn LeRoy

GNU readline support and
Linux port by
    David R. Conrad

WebAssembly port by
    Peter Buchanan

`;

