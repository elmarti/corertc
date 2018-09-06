import { UserAgentEventEnum } from '@rtcfly/user-agent-event.enum';
export interface IUserAgent {
    call(params:ICallParams): void; 
    init(configuration:IRTCSession): void; 
    on(action:UserAgentEventEnum, callback:(dialog:IDialog)=> void);

}
export interface IUserAgentEvent {
    
}
export interface IDataChannel {
    
}
// export interface IFlyAdapter {
    
//   RTCPeerConnection();
//   RTCDataChannel();
//   RTCDataChannelEvent();
//   RTCSessionDescription(); 
//   RTCSessionDescriptionCallback();
//   RTCStatsReport();
//   RTCIceCandidate(); 
//   RTCPeerConnectionIceEvent();
//   RTCRtpSender(); 
//   RTCRtpReceiver();
//   RTCRtpContributingSource(); 
//   RTCConfiguration();
//   RTCSctpTransport();
//   RTCIdentityAssertion();
//   RTCIdentityEvent();
//   RTCIdentityErrorEvent();
//   RTCCertificate();
//   getUserMedia();
// }
export interface IRTCService extends IEventEmitter {
    init(config:IRTCConfiguration);
    createSession(dialogId:string, callParams:ICallParams);
    getDevices();
}
export interface IEventEmitter {
  on(action:string, callback:Function):void;
  emit(action:string, data?:any): void
}
export interface IAgentStreamEvent {
    
}

export interface IMessenger {
    register(config:IClientConfig): Promise<(event:IAgentStreamEvent)=>void>;
    invite(dialogId:string, sdp:string, targetId:string);
    //Sip Methods
    ack();
    cancel();
    options();
    prack();
    subscribe();
    notify();
    publish();
    info();
    refer();
    message();
    update();
    
    //Custom
    answer();
    reject();
    iceCandidate(iceCandidate:any);
    on(action:string, callback:Function);
}
export interface IDialogFactory {
    createAnswer(offer): IDialog;
    createInvite(userId: string|number): IDialog;
}
export interface IInviteDto {
    sdp:string; 
    dialogId:string|number;
}
export interface IMediaWrapper {
    localVideo:IVideoWrapper;
    remoteVideo:IVideoWrapper;
    setVideoElements(elements:any);
}

export interface IVideoWrapper {
    streamMuted :boolean;
    toggleMute ():void;
    getElement(): IHTMLMediaElement;
    pause() : void;
    play(): Promise<any> ;
    setStream(stream: IMediaStream, muted? : boolean) : void ;
    stop():void;
}
export interface IWindowWebSocket{
    close();
    send();
}
export interface IWebClient {
    sendMessage();
    recieveMessage();
}
export interface IDialog {
    getId(): string|number;
    on(action:DialogEventsEnum, callback:Function);
    answer(); 
    reject();
}
export interface IIPService {
    getIP():string;
}

export interface ICallParams {
    targetId:string; 
    localElement: IHTMLMediaElement;
    remoteElement: IHTMLMediaElement;
    video:boolean; 
    audio:boolean;
}

export interface IRTCSession {
    setLocalStream(stream:any): void;
    getOffer(): string;
    setAnswer(sdp:string): void;
}

export interface IHTMLMediaElement{
     play() : Promise<any>;
     pause() : void;
     paused: boolean;
     muted: boolean;
     srcObject: IMediaStream;
}


export interface IMediaStream {
    stream: Object;
}

export interface IRTCSession {
    rtcConfiguration:IRTCConfiguration;
    clientConfig:IClientConfig;
}
export interface IRTCConfiguration {
    iceServers:Array<any>;
}


export interface IClientConfig {
    ServerURI:string;
}

export interface IErrorService {
    missingConfig();
    invalidConfig(missingField:string);
    invalidCallTarget(callTarget:string);
}