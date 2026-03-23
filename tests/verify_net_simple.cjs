const net = require('net');

async function test() {
    console.log("Starting minimal net server on 3003...");
    const server = net.createServer((socket) => {
        console.log("Server: Client connected.");
        socket.write("HELLO_FROM_SERVER\n");
    });

    server.listen(3003, '127.0.0.1');

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log("Client: Connecting...");
    const client = net.createConnection({ port: 3003 }, () => {
        console.log("Client: Connected.");
    });

    client.on('data', (data) => {
        console.log("Client: Received:", data.toString().trim());
        if (data.toString().includes("HELLO_FROM_SERVER")) {
            console.log("SUCCESS: Minimal Net Contract Verified.");
            process.exit(0);
        }
    });

    setTimeout(() => {
        console.error("FAILURE: Timeout reached.");
        process.exit(1);
    }, 5000);
}

test();
