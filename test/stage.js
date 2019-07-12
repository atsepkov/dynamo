import { Stage } from "../lib/stage";

describe("stage initialization tests", () => {
    let s = new Stage("../dynamo_test", 0);
    beforeAll(() => s.init());

    test("gets correct list of files in directory", () => {
        expect(Object.keys(s.codebits).sort()).toMatchObject([
            "bar/index.js",
            "baz.html",
            "foo.js"
        ]);
    });

    test("generates correct codebit content", () => {
        expect(s.codebits["foo.js"].template).toMatchInlineSnapshot();
    });
});

describe("stage codebit fetch tests", () => {
    let s = new Stage("../dynamo_test", 0);
    beforeAll(() => s.init());

    test("retrieves existing codebit", () => {
        expect(s.get("foo.js")).toMatchInlineSnapshot()
    })

    // test("generates new codebit using slice syntax (hash)" () => {
    //     expect(s.get("foo.js", { one: '' }))
    // })
})
