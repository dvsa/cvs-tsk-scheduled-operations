import { NotificationService } from "../../src/services/NotificationService";
import { TEMPLATE_IDS } from "../../src/utils/Enums";
import HTTPError from "../../src/models/HTTPError";

describe("Notification Service", () => {
  afterEach(() => {
    jest.resetModuleRegistry();
    jest.restoreAllMocks();
  });
  describe("sendVisitExpiryNotifications", () => {
    describe("when passed an array of UserDetails", () => {
      it("invokes sendNotification once per arrayItem, with correct Params", () => {
        expect.assertions(3);
        const sendEmailSpy = jest.fn().mockResolvedValue("");
        const notifSpy = jest.fn().mockImplementation(() => {
          return {
            sendEmail: sendEmailSpy,
          };
        });

        const svc = new NotificationService(new notifSpy());
        svc.sendVisitExpiryNotifications([
          { email: "abc123" },
          { email: "bcd234" },
        ]);
        expect(sendEmailSpy.mock.calls).toHaveLength(2);
        expect(sendEmailSpy.mock.calls[0][0]).toEqual(
          TEMPLATE_IDS.TESTER_VISIT_EXPIRY
        );
        expect(sendEmailSpy.mock.calls[0][1]).toEqual("abc123");
      });
      describe("and the notifyClient returns success", () => {
        it("returns an array of promise resolution values", async () => {
          expect.assertions(3);
          const sendEmailSpy = jest.fn().mockResolvedValue("all good");
          const notifSpy = jest.fn().mockImplementation(() => {
            return {
              sendEmail: sendEmailSpy,
            };
          });

          const svc = new NotificationService(new notifSpy());
          const output = await svc.sendVisitExpiryNotifications([
            { email: "abc123" },
            { email: "bcd234" },
          ]);
          expect(output).toHaveLength(2);
          expect(output[0]).toEqual("all good");
          expect(output[1]).toEqual("all good");
        });
      });
      describe("and the notifyClient returns any failure", () => {
        it("throws an error", async () => {
          expect.assertions(1);
          const sendEmailSpy = jest
            .fn()
            .mockResolvedValueOnce("all good")
            .mockRejectedValue(new HTTPError(418, "It broke"));
          const notifSpy = jest.fn().mockImplementation(() => {
            return {
              sendEmail: sendEmailSpy,
            };
          });

          const svc = new NotificationService(new notifSpy());
          try {
            await svc.sendVisitExpiryNotifications([
              { email: "abc123" },
              { email: "bcd234" },
            ]);
          } catch (e) {
            expect(e.statusCode).toEqual(418);
          }
        });
      });
    });
  });
});
