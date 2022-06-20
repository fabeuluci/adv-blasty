import * as nodemailer from "nodemailer";
import * as SMTPTransport from "nodemailer/lib/smtp-transport";
import { Logger } from "adv-log";
import { Inject } from "adv-ioc";
import { IConfigService } from "./IConfigService";
import { ViewHelper } from "../view/ViewHelper";
import { RenderOptions } from "../view/ViewRenderer";

export class MailService {
    
    @Inject protected logger: Logger;
    @Inject protected configService: IConfigService;
    @Inject protected mailViewHelper: ViewHelper;
    
    async send(options: nodemailer.SendMailOptions) {
        const mailConfig = this.configService.values.mail;
        const smOptions: SMTPTransport.Options = {
            host: mailConfig.host,
            port: mailConfig.port,
            secure: mailConfig.secure,
            requireTLS: mailConfig.requireTLS,
            ignoreTLS: mailConfig.ignoreTLS
        };
        if (mailConfig.auth) {
            smOptions.auth = {
                user: mailConfig.user,
                pass: mailConfig.pass
            };
        }
        if (mailConfig.checkCert === false) {
            smOptions.tls = {
                rejectUnauthorized: false
            };
        }
        const transporter = nodemailer.createTransport(smOptions);
        return transporter.sendMail(options);
    }
    
    async renderMail(view: string, model?: any) {
        const viewBag: any = {};
        return {
            html: await this.renderMailTemplate({template: "mail/" + view, viewBag: viewBag, model: model}),
            subject: <string>viewBag.subject
        };
    }
    
    async renderMailTemplate(options: RenderOptions): Promise<string> {
        return this.mailViewHelper.render(options);
    }
    
    async sendSafe(func: () => Promise<unknown>, errorName: string) {
        try {
            await func();
        }
        catch (e) {
            this.logger.error(errorName, e);
        }
    }
}
