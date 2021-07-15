// @ts-ignore
import { NotifyClient } from "notifications-node-client";
import { TEMPLATE_IDS } from "../utils/Enums";
import { ITesterDetails } from "../models";
import HTTPError from "../models/HTTPError";

/**
 * Service class for Certificate Notifications
 */
class NotificationService {
  private readonly notifyClient: NotifyClient;

  constructor(notifyClient: NotifyClient) {
    this.notifyClient = notifyClient;
  }

  /**
   * Send multiple emails based on array of user details
   * @param userDetails
   */
  public sendVisitExpiryNotifications(userDetails: ITesterDetails[]) {
    const sendEmailPromise = [];
    for (const detail of userDetails) {
      const sendEmail = this.notifyClient.sendEmail(
        TEMPLATE_IDS.TESTER_VISIT_EXPIRY,
        detail.email
      );
      sendEmailPromise.push(sendEmail);
    }

    return Promise.all(sendEmailPromise)
      .then((response: any) => {
        console.log("Response from Notify Client: ", response);
        return response;
      })
      .catch((error) => {
        console.error(error);
        throw new HTTPError(error.statusCode, error.message);
      });
  }
}

export { NotificationService };
