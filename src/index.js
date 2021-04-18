const path=require('path');
const express=require('express');
const http=require('http');
const socketio=require('socket.io');
const Filter=require('bad-words');
const {generateMessage,generateLocationMessage}=require('./utils/messages');
const {addUser,removeUser,getUser,getUsersInRoom}=require('./utils/users');


const app=express();
const server=http.createServer(app);
const io=socketio(server);
const port=process.env.PORT||3000;
const publicDirectoryPath=path.join(__dirname,'../public');
app.use(express.static(publicDirectoryPath));



// let count=0;
io.on('connection',(socket)=>{
    console.log('New Web Socket connection');
    // socket.emit('countUpdated',count);
    // socket.on('increment',()=>{
    //     count++;
    //     // socket.emit('countUpdated',count);
    //     io.emit('countUpdated',count);
    // })
    socket.on('join',({username,room},callback)=>{
        const {error,user}=addUser({id:socket.id,username,room});
        if (error) {
            return callback(error);
        }

        socket.join(user.room);
        socket.emit('message',generateMessage('admin','Welcome!'));
        socket.broadcast.to(user.room).emit('message',generateMessage('admin',`${user.username} has joined!`));
        io.to(user.room).emit('roomData',{
            room:user.room,
            users:getUsersInRoom(user.room)
        })
        callback();
    })


   
    socket.on('sendMessage',(message,callback)=>{
        const user=getUser(socket.id);
        const filter=new Filter();
        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed');
        }

        io.to(user.room).emit('message',generateMessage(user.username,message));
        callback();
    })

    socket.on('disconnect',()=>{
        
        const user=removeUser(socket.id);
        console.log(user);
        if (user) {
            io.to(user.room).emit('message',generateMessage('Admin',`${user.username} has left!`));
            io.to(user.room).emit('roomData',{
                room:user.room,
                users:getUsersInRoom(user.room)
            })
        }
        
    })

    socket.on('sendLocation',(coords,callback)=>{
        const user=getUser(socket.id);
        // console.log(user.username);
        io.to(user.room).emit('locationMessage',generateLocationMessage(user.username,`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`));
        callback();
    })    

    

})

server.listen(port,()=>{
    console.log(`Server is up on port ${port} !`);
})