// this is needed so that different part of the application can communicate without tightly coupled
import {EventEmitter} from "node:events";
// this lets one part of program emit and other will listen for that event


class InspectorEventBus extends EventEmitter{
    emitNewFailure (data: {
        jobId: string;
        externalJobId: string;
        queueName: string;
        attemptNumber: number;
        errorName: string;
        errorMessage: string;
        failedAt: string;

    }){
        this.emit("new_feature", data)
    }
}
export const eventBus = new InspectorEventBus();
