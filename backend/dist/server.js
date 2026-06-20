"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3003;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const DATA_DIR = path_1.default.resolve(process.cwd(), 'data');
const LEVELS_FILE = path_1.default.join(DATA_DIR, 'levels.json');
function loadLevels() {
    try {
        const raw = fs_1.default.readFileSync(LEVELS_FILE, 'utf-8');
        return JSON.parse(raw);
    }
    catch (err) {
        console.error('Failed to load levels:', err);
        return { levels: [] };
    }
}
function saveLevels(data) {
    try {
        if (!fs_1.default.existsSync(DATA_DIR)) {
            fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs_1.default.writeFileSync(LEVELS_FILE, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    }
    catch (err) {
        console.error('Failed to save levels:', err);
        return false;
    }
}
function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b > 0.0001) {
        const t = b;
        b = a % b;
        a = t;
    }
    return a;
}
function isSimpleFrequencyRatio(f1, f2, maxDenom = 10) {
    const maxF = Math.max(f1, f2);
    const minF = Math.min(f1, f2);
    if (minF < 0.0001)
        return false;
    const ratio = maxF / minF;
    for (let denom = 1; denom <= maxDenom; denom++) {
        const numer = ratio * denom;
        const rounded = Math.round(numer);
        if (Math.abs(numer - rounded) < 0.02 && rounded <= maxDenom && rounded > 0) {
            return true;
        }
    }
    return false;
}
app.get('/api/levels', (_req, res) => {
    const data = loadLevels();
    res.json({
        success: true,
        total: data.levels.length,
        levels: data.levels.map((l) => ({
            id: l.id,
            name: l.name,
            creatureName: l.creatureName
        }))
    });
});
app.get('/api/levels/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = loadLevels();
    const level = data.levels.find((l) => l.id === id);
    if (!level) {
        res.status(404).json({
            success: false,
            error: `Level ${id} not found`
        });
        return;
    }
    res.json({
        success: true,
        level
    });
});
app.get('/api/levels/:id/verify', (req, res) => {
    const id = parseInt(req.params.id);
    const edgeParam = req.query.edge;
    if (!edgeParam) {
        res.status(400).json({
            success: false,
            error: 'Missing edge parameter'
        });
        return;
    }
    const [from, to] = edgeParam.split('-');
    if (!from || !to) {
        res.status(400).json({
            success: false,
            error: 'Invalid edge format, expected from-to'
        });
        return;
    }
    const data = loadLevels();
    const level = data.levels.find((l) => l.id === id);
    if (!level) {
        res.status(404).json({
            success: false,
            error: `Level ${id} not found`
        });
        return;
    }
    const fromPoint = level.anchorPoints.find(p => p.id === from);
    const toPoint = level.anchorPoints.find(p => p.id === to);
    if (!fromPoint || !toPoint) {
        res.json({
            success: true,
            valid: false,
            reason: 'Unknown anchor point'
        });
        return;
    }
    const isDefinedEdge = level.edges.some(e => (e.from === from && e.to === to) || (e.from === to && e.to === from));
    const f1 = fromPoint.frequency;
    const f2 = toPoint.frequency;
    const maxF = Math.max(f1, f2);
    const minF = Math.min(f1, f2);
    const isHarmonic = isSimpleFrequencyRatio(f1, f2);
    res.json({
        success: true,
        valid: isDefinedEdge && isHarmonic,
        isHarmonic,
        isDefinedEdge,
        frequencies: {
            [from]: f1,
            [to]: f2
        },
        ratio: isHarmonic ? [minF, maxF] : null
    });
});
app.post('/api/levels', (req, res) => {
    const newLevel = req.body;
    if (!newLevel.id || !newLevel.anchorPoints || !newLevel.edges) {
        res.status(400).json({
            success: false,
            error: 'Invalid level data'
        });
        return;
    }
    const data = loadLevels();
    const existing = data.levels.findIndex(l => l.id === newLevel.id);
    if (existing >= 0) {
        data.levels[existing] = newLevel;
    }
    else {
        data.levels.push(newLevel);
    }
    if (saveLevels(data)) {
        res.json({
            success: true,
            level: newLevel
        });
    }
    else {
        res.status(500).json({
            success: false,
            error: 'Failed to save level'
        });
    }
});
app.get('/api/health', (_req, res) => {
    const data = loadLevels();
    res.json({
        success: true,
        status: 'running',
        port: PORT,
        levelsLoaded: data.levels.length
    });
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✨ 星座游戏服务器启动成功`);
    console.log(`📡 服务地址: http://localhost:${PORT}`);
    console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
    console.log(`🎮 关卡数量: ${loadLevels().levels.length}\n`);
});
