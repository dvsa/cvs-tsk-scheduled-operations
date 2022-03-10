import { cleanupVisits } from "../../src/functions/cleanupVisits";
import { CleanupService } from "../../src/services/CleanupService";
import { Configuration } from "../../src/utils/Configuration";

describe("CleanupVisits function", () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });
  process.env.SECRET_NAME = "something";
  jest
    .spyOn(Configuration.prototype, "getNotifyConfig")
    .mockResolvedValue({ api_key: "something", templateId: "something" });

  it("invokes the CleanupService's cleanupVisits function", async () => {
    const svcMock = jest.fn().mockResolvedValue("");
    jest
      .spyOn(CleanupService.prototype, "cleanupVisits")
      .mockImplementation(svcMock);

    await cleanupVisits();
    expect(svcMock).toHaveBeenCalled();
  });

  it("returns 201 if no error thrown by service", async () => {
    jest
      .spyOn(CleanupService.prototype, "cleanupVisits")
      .mockResolvedValue("all good");

    const output = await cleanupVisits();
    expect(output.statusCode).toEqual(201);
  });

  it("returns error code if service throws error", async () => {
    jest
      .spyOn(CleanupService.prototype, "cleanupVisits")
      .mockRejectedValue({ statusCode: 418, body: "bad things!" });

    const output = await cleanupVisits();
    expect(output.statusCode).toEqual(418);
    expect(output.body).toEqual("bad things!");
  });
});
