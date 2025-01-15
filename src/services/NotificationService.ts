// @ts-ignore
import { NotifyClient } from 'notifications-node-client';
import { Configuration } from '../utils/Configuration';
import { ActivitySchema } from "@dvsa/cvs-type-definitions/types/v1/activity";

/**
 * Service class for Notifications
 */
class NotificationService {
  private readonly notifyClient: NotifyClient;
  private readonly config: Configuration;

  constructor(notifyClient: NotifyClient) {
    this.notifyClient = notifyClient;
    this.config = Configuration.getInstance();
  }

  /**
   * Send email to the tester with the details of the visit
   * @param visit
   */
  async sendVisitExpiryNotification(visit: ActivitySchema) {
    const templateId: string = await this.config.getTemplateIdFromEV();
    return this.notifyClient.sendEmail(templateId, visit.testerEmail);
  }
}

export { NotificationService };
