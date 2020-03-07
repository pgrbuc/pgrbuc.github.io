.DEFAULT_GOAL = all
ALL     =

CFLAGS     ?= --std=c99 -Wall -Wextra -Wpedantic
CFLAGS     += -Wno-unused-function
#CFLAGS     += -O3 -DNDEBUG -march=native
CFLAGS     += -O0 -g

# Emscripten
ECC        ?= emcc
ECFLAGS    ?= --std=c99 -O2 -w -s NO_EXIT_RUNTIME=1 -DWASM -s WASM=1

################################
## Utilities                 |||
################################

util/%: util/%.c
	$(CC) $(CFLAGS) $< -o $@

ALL    += util/base64
util/base64:    util/base64.c

ALL    += util/cat
util/cat:    util/cat.c

ALL    += util/prepi.lex.c
util/prepi.lex.c:  util/prepi.l util/cat.c util/base64.c util/prepi.h
	$(LEX) -o $@ $<

ALL    += util/prepi
util/prepi: util/prepi.lex.c

################################
## Patched Cdecl             |||
################################

ALL    += patched/
patched/:
	mkdir -p $@

patched/%: cdecl-2.5/%
	cp $< $@

ALL += patched/cdgram.c
patched/cdgram.c: patched/cdgram.y
	$(YACC) -o $@ $<

ALL += patched/cdlex.c
patched/cdlex.c: patched/cdlex.l res/cdlex.l.patch
	patch $< res/cdlex.l.patch
	$(LEX) -l -o $@ $<

ALL += patched/cdecl.c
patched/cdecl.c: cdecl-2.5/cdecl.c res/cdecl.c.patch
	cp $< $@
	patch $@ res/cdecl.c.patch

ALL += res/module.html
res/module.html: patched/cdecl.c
	$(ECC) $(ECFLAGS) -o res/module.html $<

ALL += res/module.wasm
res/module.wasm: res/module.html
	@

ALL += res/module.js
res/module.js: res/module.html
	@

################################
##                           |||
################################

ALL    += res/date.txt
res/date.txt: res/index.html res/style.css
	printf "Built on " > $@;
	date +"%D at %r" >> $@;
	printf "\n" >> $@;


ALL    += index.html
index.html: res/index.html     \
            util/*             \
            res/*
	./util/prepi res/ $< > $@

################################
##                           |||
################################

.PHONY: all clean install

all: $(ALL)

clean:
	rm -rf $(ALL)

install: $(ALL) index.html
	cp index.html ../test.html

push: $(ALL) index.html
	cp index.html ../index.html
