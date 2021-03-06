import React, { createRef, FC, RefObject, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import Peer from "peerjs";

interface RemoteData {
    type: "hello" | "bye";
}

interface Node {
    id: string;
    color: string;
}
interface MediaStreamRef {
    media: MediaStream;
    ref: RefObject<HTMLVideoElement> | null;
}

interface PeerConnection {
    [key: string]: MediaStreamRef;
}

interface RemoteBoardProps {
    canvasElement?: HTMLCanvasElement;
    socket: Socket;
    width?: string | number;
    height?: string | number;
}

const RemoteBoards: FC<RemoteBoardProps> = ({ canvasElement, socket, width, height }: RemoteBoardProps) => {
    // const [videoRefs, setVideoRefs] = useState<RefObject<HTMLVideoElement>[]>([]);

    const [remoteCanvas, setRemoteCanvas] = useState<PeerConnection>({});

    const totalRemotes = Object.keys(remoteCanvas).length;

    useEffect(() => {
        // setVideoRefs((elRefs) =>
        //     Array(remoteCanvas.length)
        //         .fill(null)
        //         .map((_, i) => elRefs[i] || createRef())
        // );
        let finalRemotes: PeerConnection = { ...remoteCanvas };

        Object.keys(remoteCanvas).map((r) => {
            if (remoteCanvas[r].ref === null) {
                finalRemotes[r].ref = createRef();
            }
        });

        setRemoteCanvas(finalRemotes);
    }, [totalRemotes]);

    useEffect(() => {
        // remoteCanvas.map((stream, i) => {
        //     if (videoRefs[i].current == null) {
        //         return;
        //     }
        //     videoRefs[i].current!.srcObject = stream;
        // });

        Object.keys(remoteCanvas).map((r) => {
            if (remoteCanvas[r].ref !== null && remoteCanvas[r].ref?.current != null) {
                //@ts-ignore
                remoteCanvas[r].ref.current!.srcObject = remoteCanvas[r].media;
            }
        });
    }, [remoteCanvas]);

    useEffect(() => {
        if (!canvasElement) {
            return;
        }

        const peer = new Peer();

        socket.on("contact-list", (nodes: Array<Node>) => {
            console.log(`I'm ${peer.id}, ready to connect with my peers`);
            nodes.forEach((node: Node) => {
                console.log(`calling to ${node}`);

                const conn = peer.connect(node.id);

                conn.send("hello");

                conn.on("data", (data: RemoteData) => {
                    console.log(`event [${data.type}] from ${conn.peer}`);
                });

                conn.on("close", () => {
                    console.log(`event [close] from ${conn.peer}`);
                    let newRemoteCanvas = { ...remoteCanvas };
                    delete newRemoteCanvas[call.peer];
                    setRemoteCanvas(newRemoteCanvas);
                });

                //@ts-ignore
                let stream: MediaStream = canvasElement.captureStream(25);

                const call = peer.call(node.id, stream);

                call.on("stream", (remoteStream: MediaStream) => {
                    setRemoteCanvas((r) => ({ ...r, [call.peer]: { media: remoteStream, ref: null } }));
                });

                call.on("close", () => {
                    console.log(`closing call with ${call.peer}`);
                    let newRemoteCanvas = { ...remoteCanvas };
                    delete newRemoteCanvas[call.peer];
                    setRemoteCanvas(newRemoteCanvas);
                });
            });
        });

        peer.on("open", (id: string) => socket.emit("register-node", id));

        peer.on("call", (call: Peer.MediaConnection) => {
            console.log(`call from ${call.peer}`);
            //@ts-ignore
            let stream: MediaStream = canvasElement.captureStream(25);

            call.answer(stream);

            call.on("stream", (remoteStream: MediaStream) => {
                setRemoteCanvas((r) => ({ ...r, [call.peer]: { media: remoteStream, ref: null } }));
            });

            call.on("close", () => {
                console.log(`closing call with ${call.peer}`);
                let newRemoteCanvas = { ...remoteCanvas };
                delete newRemoteCanvas[call.peer];
                setRemoteCanvas(newRemoteCanvas);
            });

            const conn = peer.connect(call.peer);

            conn.on("data", (data: RemoteData) => {
                console.log(`event [${data.type}] from ${conn.peer}`);
            });

            conn.on("close", () => {
                console.log(`event [close] from ${conn.peer}`);
                let newRemoteCanvas = { ...remoteCanvas };
                delete newRemoteCanvas[call.peer];
                setRemoteCanvas(newRemoteCanvas);
            });
        });

        peer.on("close", () => {
            console.log("closing");
        });

        peer.on("disconnected", () => {
            console.log("disconnecting");
        });
    }, [canvasElement]);

    return (
        <>
            {Object.keys(remoteCanvas).map((r, i) => (
                <video
                    ref={remoteCanvas[r].ref}
                    key={i}
                    autoPlay
                    muted
                    width={width}
                    height={height}
                    style={{ position: "absolute", mixBlendMode: "lighten" }}
                ></video>
            ))}
        </>
    );
};

export default RemoteBoards;
