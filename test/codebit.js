import { CodeBit } from "../lib/codebit";

describe("template tests", () => {
    test("no variables", () => {
        let bit = new CodeBit("foo = {}");
        expect(bit.variables).toMatchObject([]);
    });

    test("no variables, with delimiters", () => {
        let bit = new CodeBit(`
      foo << bar >>
      baz
      `);
        expect(bit.variables).toMatchObject([]);
    });

    test("3 variables", () => {
        let bit = new CodeBit(`
      << foo, bar, baz >>
      foo => bar => baz
      `);
        expect(bit.variables).toMatchObject(["foo", "bar", "baz"]);
    });

    test("multi-line magic declaration", () => {
        let bit = new CodeBit(`
      << 
        foo, 
        bar, 
        baz 
      >>
      foo => bar => baz
      `);
        expect(bit.variables).toMatchObject(["foo", "bar", "baz"]);
    });

    test("template hydrates", () => {
        let bit = new CodeBit(`
      << foo, bar, baz >>
      foo => bar => baz => qux => foo
      `);
        expect(bit.template).toEqual("${foo} => ${bar} => ${baz} => qux => ${foo}");
    });

    test("magic misuse", () => {
        expect(
            () =>
            new CodeBit(`
            << foo, bar, baz
            foo => bar => baz
            `)
        ).toThrowError(/unterminated magic/);
    });

    test("alignment for multiline statements", () => {
        let bit = new CodeBit(`
            << foo, bar, baz, qux, quux, quuz >>
            foo.bar(unchanged, ['baz', 'quuz'])
            quux.forEach((qux) => 'quuz', 'quuz', 'quuz')
            `);
        expect(bit.template).toEqual(
            "foo.bar(unchanged, ['baz', 'quuz'])\nquux.forEach((qux) => 'quuz', 'quuz', 'quuz')"
        );
    });
});

describe("injection tests", () => {
    let bit = new CodeBit(`
        << foo, bar, baz, qux, quux, quuz >>
        The template doesn't matter
        `);

    test("injecting undeclared variable", () => {
        expect(() => bit.inject({ cabbage: "a" })).toThrowError(/does not exist/);
    });

    test("injecting good variables creates dimension", () => {
        bit.inject({ foo: 1, bar: 3 });
        expect(Object.keys(bit.interfaces)).toMatchObject(["bar,foo"]);
    });

    test("injecting good variables uses them up", () => {
        expect(bit.usedVars).toMatchObject(["bar", "foo"]);
    });

    test("injecting same set of variables appends to existing dimension", () => {
        bit.inject({ foo: 3, bar: 10 });
        expect(bit.interfaces["bar,foo"].length).toEqual(2);
        expect(bit.dimensions.length).toEqual(1);
    });

    test("injecting new set creates new dimension", () => {
        bit.inject({ baz: 3, quux: 10 });
        expect(bit.dimensions.length).toEqual(2);
    });

    test("reusing injection variables for new dimension", () => {
        expect(() => bit.inject({ quuz: 3, quux: 10 })).toThrowError(
            /was already injected/
        );
    });

    test("mixing variables from two dimensions", () => {
        expect(() => bit.inject({ foo: 3, quux: 10 })).toThrowError(
            /was already injected/
        );
    });

    test("missing variables from existing dimension", () => {
        expect(() => bit.inject({ foo: 3 })).toThrowError(/was already injected/);
    });
});

describe("generation tests", () => {
    let bit = new CodeBit(`
        << foo, bar, baz, qux, quux, quuz >>
        foo.bar(unchanged, ['baz', 'quuz'])
        quux.forEach((qux) => 'quuz', 'quuz', 'quuz')
        `);
    bit.inject({ foo: "obj", bar: "method" });
    bit.inject({ baz: "1x", quuz: "4x" });
    bit.inject({ baz: "once", quuz: "four times" });
    bit.inject({ qux: "v", quux: "list" });

    test("single injection", () => {
        let bit1 = new CodeBit(`
            << foo >>
            foo = bar
            `);
        bit1.inject({ foo: "v" });
        expect(bit1.generate()).toEqual("v = bar");
    });

    test("generate multiplies dimensions", () => {
        expect(bit.generate()).toMatchInlineSnapshot(`
                                                "obj.method(unchanged, ['1x', '4x'])
                                                        list.forEach((v) => '4x', '4x', '4x')

                                                obj.method(unchanged, ['once', 'four times'])
                                                        list.forEach((v) => 'four times', 'four times', 'four times')"
                                `);
    });

    test("order should match dimension order", () => {
        let r = bit.generate();
        let i1 = r.indexOf("1x");
        let i2 = r.indexOf("once");
        expect(i1).toBeGreaterThan(-1);
        expect(i2).toBeGreaterThan(-1);
        expect(i2).toBeGreaterThan(i1);
    });

    test("splits generated code into requested groups", () => {
        expect(bit.generate(["zig", "zag"])).toMatchInlineSnapshot(`
                                          Object {
                                            "zag": "obj.method(unchanged, ['once', 'four times'])
                                                  list.forEach((v) => 'four times', 'four times', 'four times')",
                                            "zig": "obj.method(unchanged, ['1x', '4x'])
                                                  list.forEach((v) => '4x', '4x', '4x')",
                                          }
                            `);
    });

    test("code split into groups should preserve order", () => {
        let chunks = bit.generate(["zig", "zag"]);
        expect(chunks["zig"].includes("1x")).toBeTruthy();
        expect(chunks["zag"].includes("once")).toBeTruthy();
    });

    test("refuse to generate when there is a group mismatch", () => {
        expect(() => bit.generate(["zig"])).toThrowError(/can't group into/);
    });

    test("shouldn't mangle when values match keys", () => {
        bit.inject({ qux: "bar", quux: "qux" });
        expect(bit.generate()).toMatchInlineSnapshot(`
                                "obj.method(unchanged, ['1x', '4x'])
                                        list.forEach((v) => '4x', '4x', '4x')

                                obj.method(unchanged, ['1x', '4x'])
                                        qux.forEach((bar) => '4x', '4x', '4x')

                                obj.method(unchanged, ['once', 'four times'])
                                        list.forEach((v) => 'four times', 'four times', 'four times')

                                obj.method(unchanged, ['once', 'four times'])
                                        qux.forEach((bar) => 'four times', 'four times', 'four times')"
                    `);
    });

    test("should generate with partial binds/injection", () => {
        let bit1 = new CodeBit(`
        << foo, bar, quuz, baz, quux >>
        foo => bar => baz => { quuz, quux }
        `);
            bit1.inject({ bar: "ok", baz: "hmm" });
            bit1.inject({ bar: "-", baz: "<< ok >>" });
            bit1.inject({ quux: "!" });
            expect(bit1.generate()).toMatchInlineSnapshot(`
            "\${foo} => ok => hmm => { \${quuz}, ! }

            \${foo} => - => << ok >> => { \${quuz}, ! }"
        `);
    });
});

describe("finalize tests", () => {
    let bit = new CodeBit(`
    << foo, bar, baz, quux >>
    { foo: 1, bar: 2, baz: 3, quux: () => 'hello' }
    `);
    bit.inject({ bar: "ok", baz: "hmm" });

    test("should not finalize with partial binds/injection", () => {
        expect(() => bit.finalize()).toThrowError(/requires additional dimensions/);
    });

    test("should finalize with complete binds/injection", () => {
        bit.inject({ foo: "bam", quux: "aha" });
        expect(bit.finalize()).toEqual("{ bam: 1, ok: 2, hmm: 3, aha: () => 'hello' }");
    });
});

describe("uplift tests", () => {
    let bit = new CodeBit(`
    << foo, bar, baz, quux >>
    { foo: 1, bar: 2, baz: 3, quux: () => 'hello' }
    `);
    bit.inject({ bar: "ok", baz: "hmm" });

    test("should not uplift with partial binds/injection", () => {
        expect(() => bit.uplift()).toThrowError(/requires additional dimensions/);
    });

    test("should uplift with complete binds/injection", () => {
        bit.inject({ foo: "bam", quux: "aha" });
        let upliftedCode = bit.uplift();
        expect(upliftedCode).toMatchObject({ bam: 1, ok: 2, hmm: 3 });
        expect(upliftedCode.aha()).toEqual('hello')
    });
});
