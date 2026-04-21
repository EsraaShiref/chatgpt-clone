// routes/chat.js - Chat API Routes

const express = require('express');
const axios = require('axios');
const router = express.Router();
const db = require('../database');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_URL = process.env.GITHUB_API_URL || 'https://models.inference.ai.azure.com';

// ============ SESSION ROUTES ============

// GET all sessions
router.get('/sessions', (req, res) => {
    try {
        const sessions = db.getAllSessions();
        res.json({
            success: true,
            data: sessions,
            count: sessions.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST create new session
router.post('/sessions', (req, res) => {
    try {
        const { title, model } = req.body;

        if (!title || title.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Title is required'
            });
        }

        const session = db.createSession(title.trim(), model || 'gpt-4o-mini');

        res.status(201).json({
            success: true,
            data: session,
            message: 'Chat session created'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET specific session with messages
router.get('/sessions/:id', (req, res) => {
    try {
        const session = db.getSession(parseInt(req.params.id));

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        const messages = db.getSessionMessages(session.id);

        res.json({
            success: true,
            data: {
                ...session,
                messages: messages
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT update session title
router.put('/sessions/:id', (req, res) => {
    try {
        const { title } = req.body;

        if (!title || title.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Title is required'
            });
        }

        const session = db.updateSessionTitle(parseInt(req.params.id), title.trim());

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        res.json({
            success: true,
            data: session,
            message: 'Session updated'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE session
router.delete('/sessions/:id', (req, res) => {
    try {
        const session = db.getSession(parseInt(req.params.id));

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        db.deleteSession(parseInt(req.params.id));

        res.json({
            success: true,
            message: 'Session deleted'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ MESSAGE ROUTES ============

// POST send message (non-streaming)
router.post('/messages', async (req, res) => {
    try {
        const { sessionId, message, model } = req.body;

        if (!sessionId || !message) {
            return res.status(400).json({
                success: false,
                error: 'sessionId and message are required'
            });
        }

        const session = db.getSession(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        // Save user message
        const userMsg = db.addMessage(sessionId, 'user', message);

        // Get conversation history
        const messages = db.getSessionMessages(sessionId);
        const history = messages.map(m => ({
            role: m.role,
            content: m.content
        }));

        // Call GitHub Models API
        const aiResponse = await callGitHubModelsAPI(
            history,
            model || session.model_used
        );

        // Save assistant message
        const assistantMsg = db.addMessage(
            sessionId,
            'assistant',
            aiResponse.content
        );

        res.status(201).json({
            success: true,
            data: {
                userMessage: userMsg,
                assistantMessage: assistantMsg,
                tokensUsed: aiResponse.tokensUsed
            }
        });
    } catch (error) {
        console.error('Message error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get response'
        });
    }
});

// POST send message with streaming
router.post('/messages/stream', async (req, res) => {
    try {
        const { sessionId, message, model } = req.body;

        if (!sessionId || !message) {
            return res.status(400).json({
                success: false,
                error: 'sessionId and message are required'
            });
        }

        const session = db.getSession(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        // Save user message
        db.addMessage(sessionId, 'user', message);

        // Get conversation history
        const messages = db.getSessionMessages(sessionId);
        const history = messages.map(m => ({
            role: m.role,
            content: m.content
        }));

        // Set up SSE response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Call GitHub Models API with streaming
        await streamGitHubModelsAPI(
            res,
            history,
            model || session.model_used,
            sessionId
        );
    } catch (error) {
        console.error('Stream error:', error.message);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

// PUT edit message
router.put('/messages/:id', (req, res) => {
    try {
        const { content } = req.body;

        if (!content || content.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Content is required'
            });
        }

        const message = db.getMessage(parseInt(req.params.id));

        if (!message) {
            return res.status(404).json({
                success: false,
                error: 'Message not found'
            });
        }

        if (message.role !== 'user') {
            return res.status(400).json({
                success: false,
                error: 'Can only edit user messages'
            });
        }

        // Delete all messages after this one
        db.deleteMessagesAfter(message.session_id, parseInt(req.params.id));

        // Update message
        const updated = db.updateMessage(parseInt(req.params.id), content.trim());

        res.json({
            success: true,
            data: updated,
            message: 'Message updated'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE message
router.delete('/messages/:id', (req, res) => {
    try {
        const message = db.getMessage(parseInt(req.params.id));

        if (!message) {
            return res.status(404).json({
                success: false,
                error: 'Message not found'
            });
        }

        db.deleteMessage(parseInt(req.params.id));

        res.json({
            success: true,
            message: 'Message deleted'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST regenerate response
router.post('/messages/:id/regenerate', async (req, res) => {
    try {
        const { model } = req.body;
        const message = db.getMessage(parseInt(req.params.id));

        if (!message) {
            return res.status(404).json({
                success: false,
                error: 'Message not found'
            });
        }

        if (message.role !== 'user') {
            return res.status(400).json({
                success: false,
                error: 'Can only regenerate from user message'
            });
        }

        const session = db.getSession(message.session_id);

        // Delete assistant responses after this message
        db.deleteMessagesAfter(message.session_id, parseInt(req.params.id));

        // Get conversation history up to this message
        const allMessages = db.getSessionMessages(message.session_id);
        const history = allMessages.map(m => ({
            role: m.role,
            content: m.content
        }));

        // Call GitHub Models API
        const aiResponse = await callGitHubModelsAPI(
            history,
            model || session.model_used
        );

        // Save new assistant message
        const assistantMsg = db.addMessage(
            message.session_id,
            'assistant',
            aiResponse.content
        );

        res.json({
            success: true,
            data: assistantMsg
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ GITHUB MODELS API FUNCTIONS ============

async function callGitHubModelsAPI(messages, model = 'gpt-4o-mini') {
    const headers = {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
    };

    const payload = {
        messages: messages,
        model: model,
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1
    };

    try {
        console.log(`🤖 Calling GitHub Models API with model: ${model}`);

        const response = await axios.post(
            `${GITHUB_API_URL}/chat/completions`,
            payload,
            {
                headers: headers,
                timeout: 120000 // 2 minute timeout
            }
        );

        const content = response.data.choices[0].message.content;
        const tokensUsed = response.data.usage?.total_tokens || 0;

        console.log(`✅ API response received (${tokensUsed} tokens used)`);

        return {
            content: content,
            tokensUsed: tokensUsed,
            model: response.data.model
        };
    } catch (error) {
        console.error('❌ GitHub Models API error:', error.message);

        if (error.response?.status === 401) {
            throw new Error('Invalid GitHub token. Please check your GITHUB_TOKEN in .env');
        } else if (error.response?.status === 429) {
            throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (error.response?.status === 500) {
            throw new Error('GitHub Models API is temporarily unavailable. Please try again.');
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout. The API took too long to respond.');
        }

        throw new Error(`API Error: ${error.message}`);
    }
}

async function streamGitHubModelsAPI(res, messages, model = 'gpt-4o-mini', sessionId) {
    const headers = {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
    };

    const payload = {
        messages: messages,
        model: model,
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1,
        stream: true
    };

    try {
        console.log(`🤖 Starting stream with model: ${model}`);

        const response = await axios.post(
            `${GITHUB_API_URL}/chat/completions`,
            payload,
            {
                headers: headers,
                timeout: 120000,
                responseType: 'stream'
            }
        );

        let fullContent = '';
        let tokenCount = 0;

        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n').filter(l => l.trim());

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const jsonStr = line.replace('data: ', '');
                        if (jsonStr === '[DONE]') {
                            // Stream complete
                            const msgData = {
                                event: 'done',
                                content: fullContent,
                                tokens: tokenCount
                            };
                            res.write(`data: ${JSON.stringify(msgData)}\n\n`);

                            // Save message
                            db.addMessage(sessionId, 'assistant', fullContent);

                            return;
                        }

                        const data = JSON.parse(jsonStr);
                        if (data.choices?.[0]?.delta?.content) {
                            const chunk = data.choices[0].delta.content;
                            fullContent += chunk;
                            tokenCount++;

                            const msgData = {
                                event: 'message',
                                content: chunk
                            };
                            res.write(`data: ${JSON.stringify(msgData)}\n\n`);
                        }
                    } catch (e) {
                        console.error('Parse error:', e.message);
                    }
                }
            }
        });

        response.data.on('end', () => {
            console.log('✅ Stream completed');
            res.end();
        });

        response.data.on('error', (error) => {
            console.error('Stream error:', error.message);
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        });
    } catch (error) {
        console.error('❌ Stream error:', error.message);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
}

module.exports = router;
