.DEFAULT_GOAL = all
ALL     =

CFLAGS     ?= --std=c99 -O0 -g -Wall -Wextra -Wpedantic

# Emscripten
ECC        ?= emcc
ECFLAGS    ?= --std=c99 -O2 -w -s NO_EXIT_RUNTIME=1 -DWASM -s WASM=1

################################
## Utilities                 |||
################################

util/%: util/%.c
	$(CC) $(CFLAGS) -DPREDICT $< -o $@

ALL    += util/base64
util/base64:    util/base64.c

ALL    += util/includer
util/includer:  util/includer.c

################################
## Base64                    |||
################################

ALL    += res/b64/
res/b64/:
	mkdir -p $@

res/b64/%: res/%
	./util/base64 $< > $@;

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
	$(LEX) -o $@ $<

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
res/date.txt:
	printf "Built on " > $@;
	date +"%D at %r" >> $@;
	printf "\n" >> $@;


ALL    += index.html
index.html: res/index.html     \
            util/*             \
            res/*              \
            res/b64/style.css  \
            res/b64/module.wasm\
            res/b64/help.txt   \
            res/b64/date.txt   \
            res/b64/body.html  \
            res/b64/about.txt
	./util/includer res/ $< > $@

################################
##                           |||
################################

.PHONY: all clean install

all: $(ALL)

clean:
	rm -rf $(ALL)

install: $(ALL) index.html
	cp index.html ..
