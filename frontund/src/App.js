import React, { useState } from 'react';
import Chat from './Chat';

const App = () => {
    const [username, setUsername] = useState('');
    const [joined, setJoined] = useState(false);

    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            {!joined ? (
                <div>
                    <h2>Enter your username</h2>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your name"
                    />
                    <button onClick={() => setJoined(true)}>Join Chat</button>
                </div>
            ) : (
                <Chat username={username} />
            )}
        </div>
    );
};

export default App;
