let isTyping = false;
let conversation_id = '';
let history_message = [];
const student_id = '002';
const agent_num = 'Agent_1';

// 监听输入框回车事件
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !isTyping) {
        sendMessage();
    }
});

// 添加发送按钮事件监听
document.getElementById('sendButton').addEventListener('click', function() {
    if (!isTyping) {
        sendMessage();
    }
});

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const query = input.value.trim();
    
    // 增加输入验证
    if (!query) {
        return;
    }
    
    if (isTyping) {
        return;
    }

    try {
        isTyping = true;
        sendButton.disabled = true;
        input.value = '';
        
        // 显示用户消息
        appendMessage(query, 'user');

        // 创建AI消息容器并显示加载状态
        const messageDiv = createMessageElement('正在思考...', 'ai');
        const contentDiv = messageDiv.querySelector('.message-content');
        
        const requestData = {
            history_message: history_message,
            conversation_id: conversation_id,
            query: query,
            student_id: student_id,
            agent_num: agent_num
        };

        console.log('发送请求数据:', requestData);

        const response = await fetch('http://192.168.3.40:8000/arkdoo_chat/chat/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        console.log('服务器响应状态:', response.status);
        console.log('响应头:', Object.fromEntries(response.headers));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('服务器错误响应:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        // 清除加载状态文本
        contentDiv.textContent = '';
        
        const reader = response.body.getReader();
        let responseText = '';
        let buffer = '';

        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            console.log('收到数据块:', chunk);
            
            buffer += chunk;
            
            while (buffer.includes('\n')) {
                const newlineIndex = buffer.indexOf('\n');
                const line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);

                if (line.startsWith('data: ')) {
                    try {
                        const jsonStr = line.slice(6).trim();
                        if (!jsonStr) continue;
                        
                        const data = JSON.parse(jsonStr);
                        console.log('解析的响应数据:', data);
                        
                        // 只处理agent_message事件
                        if (data.event === 'agent_message' && data.answer !== undefined) {
                            conversation_id = data.conversation_id;
                            
                            // 获取新的文本
                            const newText = data.answer;
                            
                            // 逐字显示新文本
                            for (const char of newText) {
                                responseText += char;
                                contentDiv.textContent = responseText;
                                await sleep(30);
                            }
                            
                            const chatBox = document.getElementById('chatBox');
                            chatBox.scrollTo({
                                top: chatBox.scrollHeight,
                                behavior: 'smooth'
                            });
                        }
                    } catch (e) {
                        console.error('解析响应数据失败:', {
                            error: e,
                            rawLine: line,
                            buffer: buffer
                        });
                    }
                }
            }
        }

        // 更新历史记录
        history_message.push(
            { role: 'user', content: query },
            { role: 'assistant', content: responseText }
        );

    } catch (error) {
        console.error('详细错误信息:', {
            message: error.message,
            stack: error.stack
        });
        appendMessage(`发送消息失败: ${error.message}`, 'system');
    } finally {
        isTyping = false;
        sendButton.disabled = false;
        input.focus();
    }
}

function createMessageElement(text, type) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;
    
    messageDiv.appendChild(contentDiv);
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    return messageDiv;
}

function appendMessage(message, type) {
    createMessageElement(message, type);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
} 