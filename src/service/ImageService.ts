import { Inject } from "adv-ioc";
import * as sharp from "sharp";
import { ErrorFactory } from "./ErrorFactory";

export class ImageService {
    
    @Inject private errorFactory: ErrorFactory;
    
    async validateImage(imagePath: string, parameterPath: string) {
        try {
            await this.convertToJpg(imagePath);
        }
        catch (e) {
            throw this.errorFactory.create("INVALID_PARAMS", parameterPath + " -> Expected image file");
        }
    }
    
    convertToJpg(imagePath: string) {
        return sharp(imagePath)
            .jpeg({quality: 90, progressive: true})
            .toBuffer();
    }
}
