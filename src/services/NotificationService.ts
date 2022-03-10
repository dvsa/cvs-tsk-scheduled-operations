// @ts-ignore
import { NotifyClient } from "notifications-node-client";
import { ITesterDetails } from "../models";
import HTTPError from "../models/HTTPError";
import { Configuration } from "../utils/Configuration";

/**
 * Service class for Certificate Notifications
 */
class NotificationService {
  private readonly notifyClient: NotifyClient;
  private readonly config: Configuration;

  constructor(notifyClient: NotifyClient) {
    this.notifyClient = notifyClient;
    this.config = Configuration.getInstance();
  }

  /**
   * Send multiple emails based on array of user details
   * @param userDetails
   */
  public async sendVisitExpiryNotifications(userDetails: ITesterDetails[]) {
    const templateId: string = await this.config.getTemplateIdFromEV();
    const sendEmailPromise = [];
    for (const detail of userDetails) {
      const sendEmail = this.notifyClient.sendEmail(templateId, detail.email);
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
