
import VideoWrapper from './VideoWrapper';
import DataChannel from './DataChannel';
import { Message, MessageType, MessageDirection } from './entities/Message';


class ClientEvents {
    public eventMap: any; 
    
    private _logger:any;
    constructor({
        logger
    }){
        this.eventMap = {};
        this._logger = logger;
    }
    callEvent(event){
        this._logger.log("calling event", event);
        if(this.eventMap[event]){
            return this.eventMap[event];
        } else {
            return function(){}
        }
    }
    
}

class Client {

    private _localVideo: VideoWrapper;
    private _remoteVideo: VideoWrapper;
    private events: ClientEvents;
    private _mediaConstraints: any = {}; 
    private _iceServers:Array<any> = []; 
    private _devices:Array<IMediaDeviceInfo>;
    private _messagingClient:any;
    private _userIP:string; 
    
    public peerConnection: IPeerConnection;

    private _rtc: IRTC;
    private _ip: any; 
    private _logger: any; 

    constructor(settings: any, {
        rtc,
        ip,
        logger
    }, messagingClient:MessagingClient) {
        
        this._rtc = rtc; 
        this._ip = ip; 
        this._logger = logger; 
        this.events = new ClientEvents({
            logger
        }); 
        this._messagingClient = new MessagingClient(); 
    }
    private enumerateDevices() : void {
        this._rtc.enumerateDevices().then(devices => {
           this._devices = devices;  
        }).then(() => {
            this._rtc.onDeviceChange(event => {
                console.log("onDeviceChange", event);
                event.target.enumerateDevices(devices =>{
                     this._devices = devices;  
                })
            });
        });
    }
    public init(data:any){
        this.enumerateDevices();
        this._ip.obtainIP(IP => {
            this._logger.log("initalizing", data);
            if(data !== undefined){
                if(data.uri !== undefined){
                    this._messagingClient.init({uri:data.uri, mode:data.mode, user:data.user, IP});
                }
                if(data.iceServers){
                    this._iceServers = data.iceServers;
                }
                if(data.debug === true){
                    this._logger.enable();
                } else if(data.debug === false){
                    this._logger.disable();
                }
            }
            this._userIP = IP; 
            this.events.callEvent("coreInitialized")();
        });
    }
    /**
     * Call allows you to call a remote user using their userId
     * @param _id {string}
     * @param local {IHTMLMediaElement}
     * @param remote {IHTMLMediaElement}
     */
    public call(params:ICallParams): void {
        this._logger.log("starting call", params);
        const {video,audio,localElement,remoteElement,id} = params; 
        this._localVideo = null;
        this._remoteVideo = null;
        this._mediaConstraints = {
            audio, 
            video
        };
        if (localElement !== undefined){
            this._logger.log("setting local element", localElement);
            this._localVideo = new VideoWrapper(localElement);
        }
        if (remoteElement !== undefined){
            this._logger.log("setting remote element", remoteElement);
            this._remoteVideo = new VideoWrapper(remoteElement);
        }
        this.events.callEvent("callInitialized")(params);
    }
 
    /**
     * 
     * Create a datachannel 
     * 
     */
    public createDataChannel(options:any) : DataChannel{
        this._logger.log("creating data channel", options);
        if(!this.peerConnection){
            throw new Error("PeerConnection is not initialized");
        }
        return new DataChannel(options, this.peerConnection);
    }
    /**
     * Reject a new call that the user is recieving
     * 
     * */
    public rejectCall(){
        this._logger.log("rejecting call");
        this._localVideo = null; 
        this._remoteVideo = null; 
        this.peerConnection = null;
        this.events.callEvent("rejectCall")(); 
    }
    /**
     * handle the stream on the caller side
     * @param message {Message}
     * 
     */
    public handleSenderStream(message: Message): void {
        this._logger.log("handle sender stream", message);
        this.processIceCandidate(message);
        if (message.Type === MessageType.SessionDescription) {
            this._logger.log("handle session description", message);
            this.peerConnection.setRemoteDescription(message.data).catch(this.events.callEvent("error"));
        }
    }
    
    /**
     * Event handler for when the target accepts the call
     * 
     */
    public  handleTargetAccept() {
        this._logger.log("handle target accept");
        if(this._mediaConstraints.video || this._mediaConstraints.audio){
            this._rtc.getUserMedia(this._mediaConstraints).then((stream: any) => {
                this._logger.log("got local media", stream);
                if (this._localVideo) {
                    this._localVideo.setStream(stream, true);
                    this._localVideo.play();
                }
                this.setupPeerConnection(stream);
            }).catch((err: Error) => {
                log.error("could not get user media", err);
                this.events.callEvent("userMediaError")(err);
            });
        } else {
            this.setupPeerConnection();
        }

    }
    /**
     * handle the stream on the target
     * @param message {Message}
     * 
     */
    public handleTargetStream(message: Message) {
        this._logger.log("handle target stream", message);
        this.processIceCandidate(message);
        if (message.Type === MessageType.SessionDescription) {
            this._logger.log("handle session description");
            if(this._mediaConstraints.video !== undefined 
            || this._mediaConstraints.audio !== undefined){
                this._rtc.getUserMedia(this._mediaConstraints).then((stream:any)=>{
                    this._logger.log("getUserMedia", stream);
                if (this._localVideo) {
                    this._localVideo.setStream(stream, true);
                    this._localVideo.play();
                }
                this.setupPeerConnection(stream, message.data);
                }).catch(err =>{
                    log.error("getUserMedia failed", err);
                    this.events.callEvent("userMediaError")(err);
                });
            } else {
                this.setupPeerConnection();
            }
        }
    }
    private processIceCandidate(message:Message){
        log.info("processIceCandidate", message);
         if (message.Type === MessageType.Candidate) {
             log.info("addIceCandidate", message);
            if (this.peerConnection) {
                this.peerConnection.addIceCandidate(message.data).catch(err=>{
                    this._logger.log("could not add ice candidate",err);
                    this.events.callEvent("error")(err);
                });
            }
        }
    }
    private setupPeerConnection(stream?: IMediaStream, remoteDescription?: Object): void {
        log.info("setting peerConnection", stream, remoteDescription);
        this.peerConnection = this._rtc.createPeerConnection({
            iceServers:this._iceServers
        });
        this.peerConnection.ondatachannel = event => this.events.callEvent("datachannel")(event);
        this.events.callEvent("peerConnectionCreated")();
        this.setPeerConnectionCallbacks();
        log.info("adding stream");
        if(stream !== undefined){
            this.peerConnection.addStream(stream);
        }
        if (remoteDescription) {
            this.createTargetSession(remoteDescription);
        }
        else {
            this.createCallSession();
        }
    }

    private setPeerConnectionCallbacks(): void {
        log.info("setting peerConnection callbacks");
        this.peerConnection.onicecandidate = function (event: any)  {
            log.info("add ice candidate", event);
            this.events.callEvent("emitIceCandidate")(event.candidate);
        }.bind(this);
        this.peerConnection.onaddstream = function (stream: any) {
            log.info("on add remote stream", stream);
            if (this._remoteVideo) {
                this._remoteVideo.pause();
                this._remoteVideo.setStream(stream.stream);
                this._remoteVideo.play();
            }
        }.bind(this);
    }

    /**
     * Answer the call
     * @param local {IHTMLMediaElement}
     * @param remote {IHTMLMediaElement}
     */
    public answerCall(params: ICallParams): void {
        log.info("answer call", params);
        this._localVideo = null;
        this._remoteVideo = null;
        const {video,audio,localElement,remoteElement} = params; 
        this._mediaConstraints = {
            video, 
            audio
        };
        if (localElement !== undefined){
            log.info("setting local video", localElement);
            this._localVideo = new VideoWrapper(localElement);
        }
        if (remoteElement !== undefined){
            log.info("setting remote video", remoteElement);
            this._remoteVideo = new VideoWrapper(remoteElement);
        }
        this.events.callEvent("answerCall")(this.events.callEvent("error"));
    }
    
    public async getDevices(){
        try{
        const devices  = await this._rtc.enumerateDevices();
        console.log("donkey");
        return  devices; 
        }catch(err){
            return [];
        }
    }
    
    /**
     * End the current call
     */
    public endCall(): void {
        log.info("ending call");
        if(this._localVideo){
            log.info("stopping local video");
            this._localVideo.stop(); 
            this._localVideo = null;
        }
        if(this._remoteVideo){
            log.info("stopping remote video");
            this._remoteVideo.stop(); 
            this._remoteVideo = null;
        }
        if(this.peerConnection){
            this.peerConnection = null; 
        }
         
        this.events.callEvent("endCall")();
    }

    /**
     * Set up the target WebRTC session
     * Needs to be reimplemented with await
     * @param remoteDescription {RTCSessionDescription}
     */
    private createTargetSession(remoteDescription: Object) {
        log.info("creating target session", remoteDescription);
        this.peerConnection.setRemoteDescription(remoteDescription).then(() => {
            log.info("remote description set");
            this.peerConnection.createAnswer().then((answer: Object) => {
                log.info("creating answer", answer);
                this.peerConnection.setLocalDescription(answer).catch((setLocalDescriptionError: Error) => {
                    log.info("local description set");
                    this.events.callEvent("error")(setLocalDescriptionError);
                });
                this.events.callEvent("emitTargetAnswer")(answer);
            }).catch((createAnswerError: Error) => {
                log.error("create answer error", createAnswerError);
                this.events.callEvent("error")(createAnswerError);
            });
        }).catch((setRemoteDescriptionError: Error) => {
                log.error("set remote description error", setRemoteDescriptionError);
            this.events.callEvent("error")(setRemoteDescriptionError);
        });


    }

    private createCallSession() {
        log.info("creating call session");
        var offer = this.peerConnection.createOffer().then((offer:any)=>{
            log.info("created offer", offer);
            this.peerConnection.setLocalDescription(offer);
            this.events.callEvent("emitSenderDescription")(offer);
            this.peerConnection.setLocalDescription(offer);
        }).catch((err:Error)=>{
            log.error("create call session error", err);
            this.events.callEvent("error")(err);
        });
    }
    /**
     * Get the VideoWrapper for the local video
     * @returns {VideoWrapper}
     */
    public getLocalVideo(): VideoWrapper {
        log.info("getting local video", this._localVideo);
        if (this._localVideo) {
            return this._localVideo;
        } else {

            return undefined;
        }
    }
    /**
     * Get the VideoWrapper for the remote video
     * @returns {VideoWrapper}
     */
    public getRemoteVideo(): VideoWrapper {
        log.info("getting remote video", this._remoteVideo);
        if (this._remoteVideo) {
            return this._remoteVideo;
        } else {
            return undefined;
        }
    }
    
    public on(eventName:string, action:Function) {
        log.info("adding event", eventName);
        this.events.eventMap[eventName] = action; 
    }


}
export default Client;