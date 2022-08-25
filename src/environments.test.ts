import { getEnvironment } from "./environment";

describe("getEnvironment", () => {
  it("should return specified variables as string", () => {
    process.env.FOO = "bar";
    const env = getEnvironment(["FOO"] as const);
    expect(env.FOO).toEqual("bar");
  });

  it("should throw if missing variable(s)", () => {
    process.env.FOO = "bar";
    expect(() => getEnvironment(["FOO", "BAZ"])).toThrowError(
      `"Missing environment variables BAZ"`
    );
  });
});
