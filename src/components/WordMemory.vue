<template>
    <div class="word-memory" :class="`view-${view}`">
        <template v-if="view === 'both'">
            <div class="memory-header">
                <span class="memory-title">💡 创意记忆</span>
            </div>
            <div class="memory-content">
                <div class="memory-left">
                    <div v-if="memoryMethods.length" class="memory-list">
                        <div v-for="(method, index) in memoryMethods" :key="index" class="memory-card"
                            :class="method.type">
                            <div class="memory-card-header">
                                <span class="memory-card-icon">{{ getMethodIcon(method.type) }}</span>
                                <span class="memory-card-title">{{ getMethodName(method.type) }}</span>
                                <span v-if="method.quality" class="memory-card-quality"
                                    :class="'q-' + Math.round(method.quality)">★{{ Math.round(method.quality) }}</span>
                            </div>
                            <div class="memory-card-body">
                                <p class="memory-card-desc">{{ method.description }}</p>
                                <p v-if="method.tip" class="memory-card-tip">💡 {{ method.tip }}</p>
                            </div>
                        </div>
                    </div>
                    <div v-else class="memory-empty">
                        <span class="memory-empty-icon">📝</span>
                        <span class="memory-empty-text">暂无创意记忆方案</span>
                    </div>
                </div>
                <div class="memory-right">
                    <div v-if="loadingImages && !imageUrls.length" class="memory-image-loading">
                        <span class="memory-image-loading-icon">⏳</span>
                        <span class="memory-image-loading-text">加载中...</span>
                    </div>
                    <el-carousel v-else-if="imageUrls.length" class="memory-carousel" height="100%"
                        indicator-position="bottom" arrow="hover" autoplay>
                        <el-carousel-item v-for="(thumb, index) in imageThumbnails" :key="index">
                            <div class="memory-image-wrapper">
                                <img :src="thumb" :alt="`${word} ${index + 1}`" class="memory-carousel-image"
                                    :class="{ 'is-loaded': imageLoaded[index] }" @load="onImageLoad(index)"
                                    @error="onImageError(index)" @click="openPreview(index)" />
                                <div v-if="!imageLoaded[index]" class="memory-image-skeleton">
                                    <span class="memory-image-skeleton-icon">🖼️</span>
                                    <span class="memory-image-skeleton-text">加载中...</span>
                                </div>
                            </div>
                        </el-carousel-item>
                    </el-carousel>
                    <div v-else class="memory-image-empty">
                        <span class="memory-image-empty-icon">🖼️</span>
                        <span class="memory-image-empty-text">暂无图片</span>
                    </div>
                </div>
            </div>
        </template>
        <template v-else-if="view === 'memory'">
            <div class="memory-content memory-content-single">
                <div class="memory-left">
                    <div v-if="memoryMethods.length" class="memory-list">
                        <div v-for="(method, index) in memoryMethods" :key="index" class="memory-card"
                            :class="method.type">
                            <div class="memory-card-header">
                                <span class="memory-card-icon">{{ getMethodIcon(method.type) }}</span>
                                <span class="memory-card-title">{{ getMethodName(method.type) }}</span>
                                <span v-if="method.quality" class="memory-card-quality"
                                    :class="'q-' + Math.round(method.quality)">★{{ Math.round(method.quality) }}</span>
                            </div>
                            <div class="memory-card-body">
                                <p class="memory-card-desc">{{ method.description }}</p>
                                <p v-if="method.tip" class="memory-card-tip">💡 {{ method.tip }}</p>
                            </div>
                        </div>
                    </div>
                    <div v-else class="memory-empty">
                        <span class="memory-empty-icon">📝</span>
                        <span class="memory-empty-text">暂无创意记忆方案</span>
                    </div>
                </div>
            </div>
        </template>
        <template v-else-if="view === 'images'">
            <div class="memory-content memory-content-single">
                <div class="memory-right">
                    <div v-if="loadingImages && !imageUrls.length" class="memory-image-loading">
                        <span class="memory-image-loading-icon">⏳</span>
                        <span class="memory-image-loading-text">加载中...</span>
                    </div>
                    <el-carousel v-else-if="imageUrls.length" class="memory-carousel" height="100%"
                        indicator-position="bottom" arrow="hover" autoplay>
                        <el-carousel-item v-for="(thumb, index) in imageThumbnails" :key="index">
                            <div class="memory-image-wrapper">
                                <img :src="thumb" :alt="`${word} ${index + 1}`" class="memory-carousel-image"
                                    :class="{ 'is-loaded': imageLoaded[index] }" @load="onImageLoad(index)"
                                    @error="onImageError(index)" @click="openPreview(index)" />
                                <div v-if="!imageLoaded[index]" class="memory-image-skeleton">
                                    <span class="memory-image-skeleton-icon">🖼️</span>
                                    <span class="memory-image-skeleton-text">加载中...</span>
                                </div>
                            </div>
                        </el-carousel-item>
                    </el-carousel>
                    <div v-else class="memory-image-empty">
                        <span class="memory-image-empty-icon">🖼️</span>
                        <span class="memory-image-empty-text">暂无图片</span>
                    </div>
                </div>
            </div>
        </template>
    </div>

    <el-dialog v-model="previewVisible" :show-close="true" width="80%" top="10vh" center destroy-on-close append-to-body
        class="image-preview-dialog">
        <el-image-viewer :url-list="imageUrls" :initial-index="previewIndex" @close="previewVisible = false" />
    </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
    word: { type: String, default: '' },
    meaning: { type: String, default: '' },
    view: { type: String, default: 'both' }
})

const imageUrls = ref([])
const imageThumbnails = ref([])
const imageLoaded = ref({})
const loadingImages = ref(false)
const previewVisible = ref(false)
const previewIndex = ref(0)
const previewLoaded = ref({})

function openPreview(index) {
    previewIndex.value = index
    previewVisible.value = true
    previewLoaded.value = {}
}

function onImageLoad(index) {
    imageLoaded.value = { ...imageLoaded.value, [index]: true }
}

function onImageError(index) {
    imageLoaded.value = { ...imageLoaded.value, [index]: false }
}

function onPreviewLoad(index) {
    previewLoaded.value = { ...previewLoaded.value, [index]: true }
}

function onPreviewError(index) {
    previewLoaded.value = { ...previewLoaded.value, [index]: false }
}

const COMMON_WORDS = new Set([
    'pine', 'apple', 'bed', 'room', 'friend', 'end', 'sea', 'son', 'cat', 'bat', 'mat',
    'plan', 'plane', 'though', 'through', 'quiet', 'quite', 'happy', 'transport', 'port',
    'sign', 'fic', 'ant', 'skill', 'public', 'fish', 'table', 'day', 'south', 'local',
    'open', 'cover', 'purpose', 'reach', 'various', 'ability', 'significant', 'back',
    'able', 'un', 're', 'pre', 'dis', 'mis', 'in', 'im', 'ex', 'inter', 'sub', 'super',
    'anti', 'auto', 'de', 'fore', 'over', 'out', 'pro', 'tion', 'sion', 'ment', 'ness',
    'ful', 'less', 'ly', 'er', 'or', 'ist', 'ism', 'ize', 'ify', 'al', 'ic', 'ous', 'ive',
    'ing', 'ed', 'ship', 'dom', 'ward', 'hood', 'craft', 'man', 'woman', 'child', 'boy',
    'girl', 'father', 'mother', 'brother', 'sister', 'enemy', 'student', 'teacher', 'doctor',
    'nurse', 'engineer', 'artist', 'musician', 'writer', 'actor', 'manager', 'worker',
    'leader', 'king', 'queen', 'prince', 'princess', 'sun', 'moon', 'star', 'rain', 'snow',
    'tree', 'bird', 'dog', 'car', 'bike', 'book', 'computer', 'phone', 'music', 'game',
    'water', 'fire', 'earth', 'wind', 'cloud', 'beach', 'mountain', 'river', 'forest',
    'garden', 'house', 'school', 'office', 'hospital', 'restaurant', 'shop', 'food',
    'fruit', 'vegetable', 'bread', 'milk', 'juice', 'coffee', 'tea', 'cake', 'ice',
    'cream', 'pizza', 'hamburger', 'chocolate', 'salad', 'soup', 'meat', 'egg', 'rice',
    'flower', 'play', 'read', 'write', 'dance', 'sing', 'run', 'walk', 'jump', 'swim',
    'fly', 'drive', 'ride', 'work', 'study', 'learn', 'teach', 'help', 'love', 'hate',
    'sad', 'angry', 'afraid', 'tired', 'hungry', 'thirsty', 'cold', 'hot', 'big', 'small',
    'long', 'short', 'tall', 'wide', 'deep', 'high', 'low', 'fast', 'slow', 'new', 'old',
    'good', 'bad', 'beautiful', 'ugly', 'clean', 'dirty', 'bright', 'dark', 'soft', 'hard',
    'sweet', 'sour', 'bitter', 'spicy', 'salty', 'funny', 'exciting', 'boring', 'easy',
    'difficult', 'possible', 'impossible', 'important', 'necessary', 'different', 'same',
    'similar', 'opposite', 'together', 'alone', 'always', 'never', 'often', 'sometimes',
    'usually', 'rarely', 'quickly', 'carefully', 'happily', 'sadly', 'angrily', 'quietly',
    'loudly', 'clearly', 'correctly', 'wrongly', 'fully', 'partly', 'mostly', 'mainly',
    'really', 'very', 'too', 'enough', 'just', 'only', 'also', 'even', 'still', 'already',
    'yet', 'almost', 'nearly', 'hardly', 'barely', 'scarcely', 'totally', 'completely',
    'entirely', 'absolutely', 'definitely', 'certainly', 'probably', 'possibly', 'maybe',
    'perhaps', 'surely', 'actually', 'basically', 'generally', 'specifically', 'particularly',
    'especially', 'finally', 'eventually', 'initially', 'originally', 'previously',
    'recently', 'currently', 'presently', 'suddenly', 'gradually', 'immediately',
    'instantly', 'promptly', 'shortly', 'soon', 'later', 'early', 'late', 'today',
    'tomorrow', 'yesterday', 'tonight', 'morning', 'afternoon', 'evening', 'night',
    'week', 'month', 'year', 'hour', 'minute', 'second', 'first', 'second', 'third',
    'fourth', 'fifth', 'last', 'next', 'previous', 'this', 'that', 'these', 'those',
    'such', 'so', 'as', 'merely', 'simply', 'principally', 'largely', 'widely',
    'commonly', 'normally', 'typically', 'regularly', 'routinely', 'habitually',
    'consistently', 'frequently', 'occasionally', 'seldom', 'ever', 'forever',
    'permanently', 'temporarily', 'briefly', 'momentarily', 'abruptly', 'rapidly',
    'swiftly', 'hastily', 'cautiously', 'deliberately', 'intentionally',
    'purposefully', 'accidentally', 'inadvertently', 'incidentally', 'randomly',
    'arbitrarily', 'spontaneously', 'naturally', 'mechanically', 'artificially',
    'synthetically', 'chemically', 'biologically', 'physically', 'mentally',
    'emotionally', 'psychologically', 'spiritually', 'morally', 'ethically',
    'legally', 'politically', 'economically', 'socially', 'culturally',
    'historically', 'geographically', 'technologically', 'scientifically',
    'mathematically', 'statistically', 'logically', 'rationally', 'reasonably',
    'plausibly', 'credibly', 'believably', 'unbelievably', 'incredibly',
    'amazingly', 'astonishingly', 'surprisingly', 'unexpectedly', 'predictably',
    'inevitably', 'positively', 'undoubtedly', 'unquestionably', 'indubitably',
    'decidedly', 'distinctly', 'evidently', 'apparently', 'seemingly',
    'ostensibly', 'purportedly', 'allegedly', 'reportedly', 'supposedly',
    'presumably', 'likely', 'potentially', 'conceivably', 'practically',
    'virtually', 'effectively', 'inherently', 'intrinsically', 'extrinsically',
    'externally', 'internally', 'globally', 'nationally', 'internationally',
    'regionally', 'wise', 'uncle', 'aunt', 'cousin', 'nephew', 'niece',
    'grandfather', 'grandmother', 'husband', 'wife', 'daughter', 'stranger',
    'partner', 'colleague', 'neighbor', 'classmate', 'schoolmate', 'roommate',
    'workmate', 'team', 'group', 'crowd', 'audience', 'people', 'person', 'baby',
    'adult', 'teenager', 'youngster', 'elder', 'senior', 'junior', 'follower',
    'member', 'supporter', 'opponent', 'competitor', 'rival', 'ally',
    'acquaintance', 'guest', 'host', 'customer', 'client', 'patient', 'visitor',
    'hostess', 'owner', 'tenant', 'landlord', 'landlady', 'agent', 'lawyer',
    'judge', 'jury', 'witness', 'defendant', 'plaintiff', 'prosecutor',
    'accountant', 'banker', 'businessman', 'businesswoman', 'entrepreneur',
    'investor', 'trader', 'merchant', 'shopkeeper', 'clerk', 'secretary',
    'receptionist', 'assistant', 'technician', 'mechanic', 'carpenter',
    'electrician', 'plumber', 'painter', 'decorator', 'builder', 'architect',
    'designer', 'tailor', 'seamstress', 'hairdresser', 'beautician', 'cook',
    'chef', 'baker', 'butcher', 'farmer', 'fisherman', 'hunter', 'miner',
    'chauffeur', 'taxi', 'bus', 'train', 'truck', 'sailor', 'navigator',
    'adventurer', 'traveler', 'photographer', 'journalist', 'reporter',
    'editor', 'publisher', 'author', 'poet', 'novelist', 'playwright',
    'screenwriter', 'producer', 'actress', 'singer', 'choreographer',
    'sculptor', 'craftsman', 'artisan', 'jeweler', 'weaver', 'potter',
    'ceramist', 'glassblower', 'woodworker', 'metalworker', 'blacksmith',
    'researcher', 'inventor', 'physician', 'surgeon', 'dentist', 'optometrist',
    'pharmacist', 'midwife', 'veterinarian', 'therapist', 'counselor',
    'lecturer', 'instructor', 'tutor', 'coach', 'trainer', 'mentor',
    'advisor', 'consultant', 'expert', 'specialist', 'professional', 'volunteer',
    'laborer', 'boss', 'director', 'president', 'chairman', 'chairwoman',
    'executive', 'administrator', 'coordinator', 'organizer', 'participant',
    'contributor', 'backer', 'sponsor', 'donor', 'benefactor', 'philanthropist',
    'humanitarian', 'activist', 'campaigner', 'protester', 'demonstrator',
    'rebel', 'revolutionary', 'ruler', 'monarch', 'dictator', 'tyrant', 'chief',
    'head', 'commander', 'general', 'admiral', 'marshal', 'sergeant',
    'lieutenant', 'corporal', 'private', 'warrior', 'fighter', 'combatant',
    'veteran', 'hero', 'heroine', 'champion', 'winner', 'loser', 'victor',
    'conqueror', 'defeated', 'survivor', 'casualty', 'victim', 'sacrifice',
    'martyr', 'brave', 'courageous', 'fearless', 'bold', 'timid', 'nervous',
    'anxious', 'worried', 'fearful', 'scared', 'terrified', 'horrified',
    'shocked', 'startled', 'frightened', 'panicked', 'alarmed', 'distressed',
    'troubled', 'concerned', 'tense', 'stressed', 'frustrated', 'annoyed',
    'irritated', 'bored', 'exhausted', 'fatigued', 'weary', 'sleepy', 'drowsy',
    'lethargic', 'lazy', 'sluggish', 'drained', 'depleted', 'weak', 'feeble',
    'frail', 'sick', 'ill', 'unwell', 'ailing', 'afflicted', 'unhappy',
    'melancholy', 'gloomy', 'miserable', 'downcast', 'disheartened',
    'discouraged', 'hopeless', 'desperate', 'dejected', 'forlorn', 'cheerful',
    'joyful', 'glad', 'delighted', 'pleased', 'grateful', 'thankful',
    'appreciative', 'optimistic', 'hopeful', 'confident', 'proud', 'fulfilled',
    'accomplished', 'successful', 'triumphant', 'victorious', 'celebrated',
    'renowned', 'distinguished', 'eminent', 'prominent', 'exceptional',
    'extraordinary', 'unique', 'rare', 'scarce', 'precious', 'valuable',
    'essential', 'vital', 'crucial', 'critical', 'urgent', 'pressing',
    'immediate', 'instant', 'rash', 'impulsive', 'reckless', 'prudent',
    'sensible', 'coherent', 'steady', 'firm', 'solid', 'protected', 'guarded',
    'shielded', 'confidential', 'individual', 'particular', 'distinct',
    'identical', 'equivalent', 'comparable', 'parallel', 'corresponding',
    'matching', 'compatible', 'harmonious', 'orderly', 'systematic',
    'methodical', 'chaotic', 'jumbled', 'scrambled', 'shuffled', 'premeditated'
])

const PREFIXES = {
    un: '不，相反',
    re: '再次，重新',
    pre: '预先，在...之前',
    dis: '不，分离',
    mis: '错误，坏',
    in: '不，进入',
    im: '不，进入',
    ex: '出，外',
    inter: '在...之间',
    sub: '在...下面',
    super: '超级，在...上面',
    anti: '反对，防止',
    auto: '自己，自动',
    de: '向下，去除',
    fore: '在...之前',
    over: '过度，在...上面',
    out: '超过，外',
    pro: '向前，支持',
    trans: '跨越，转移'
}

const SUFFIXES = {
    tion: '名词后缀，表示行为或状态',
    sion: '名词后缀，表示行为或状态',
    ment: '名词后缀，表示行为或结果',
    ness: '名词后缀，表示性质或状态',
    ful: '形容词后缀，充满...的',
    less: '形容词后缀，没有...的',
    ly: '副词后缀，以...方式',
    er: '名词后缀，做...的人',
    or: '名词后缀，做...的人',
    ist: '名词后缀，从事...的人',
    ism: '名词后缀，主义或学说',
    ize: '动词后缀，使成为',
    ify: '动词后缀，使成为',
    al: '形容词后缀，...的',
    ic: '形容词后缀，...的',
    ous: '形容词后缀，具有...的',
    ive: '形容词后缀，有...倾向的',
    ing: '动词进行时/形容词后缀',
    ed: '动词过去式/形容词后缀',
    ship: '名词后缀，表示关系或身份',
    dom: '名词后缀，表示领域或状态',
    ward: '副词后缀，向...方向',
    hood: '名词后缀，表示状态或时期'
}

const ROOTS = {
    port: '搬运，携带',
    sign: '标记，信号',
    spect: '看',
    dict: '说',
    duct: '引导，带领',
    struct: '建造',
    script: '写',
    tract: '拉，拖',
    vent: '来',
    pos: '放置',
    scrib: '写',
    vis: '看',
    vid: '看',
    aud: '听',
    cred: '相信',
    graph: '写，画',
    phon: '声音',
    log: '言语，学科',
    path: '感情，疾病',
    form: '形状，形式',
    mit: '送，发',
    miss: '送，发',
    cept: '拿，取',
    ceive: '拿，取',
    fer: '带来，携带',
    tend: '伸展，趋向',
    tens: '伸展，趋向',
    press: '压',
    mov: '移动',
    mot: '移动',
    cap: '拿，取',
    capt: '拿，取',
    cept: '拿，取',
    vert: '转',
    vers: '转',
    pel: '推',
    puls: '推',
    fac: '做，制造',
    fact: '做，制造',
    fec: '做，制造',
    fin: '结束，界限',
    finit: '结束，界限',
    gen: '产生，种类',
    grad: '步，级',
    gress: '步，级',
    hab: '拥有，居住',
    ject: '抛，掷',
    man: '手',
    manu: '手',
    mem: '记忆',
    memor: '记忆',
    nat: '出生',
    nov: '新',
    oper: '工作',
    ord: '顺序',
    ordin: '顺序',
    pend: '悬挂，称重',
    pens: '悬挂，称重',
    prim: '第一',
    prior: '第一',
    rupt: '破裂',
    sec: '跟随，切',
    sequ: '跟随',
    serv: '服务，保持',
    sim: '相似',
    simil: '相似',
    sol: '单独',
    solut: '松开，解决',
    spec: '看',
    stit: '站立',
    stitut: '站立',
    tact: '接触',
    tang: '接触',
    therm: '热',
    vac: '空',
    val: '强壮，价值',
    ven: '来',
    vent: '来',
    vinc: '征服',
    vict: '征服',
    vit: '生命',
    viv: '生命'
}

const HOMOPHONIC_MAP = {
    ambulance: { text: '俺不能死', desc: '救护车' },
    pest: { text: '拍死它', desc: '害虫' },
    ambition: { text: '俺必胜', desc: '野心，抱负' },
    banana: { text: '不拿拿', desc: '香蕉' },
    beer: { text: '逼儿', desc: '啤酒' },
    bear: { text: '贝尔', desc: '熊' },
    battle: { text: '掰头', desc: '战斗' },
    beauty: { text: '逼提', desc: '美丽' },
    because: { text: '逼靠子', desc: '因为' },
    before: { text: '逼佛', desc: '之前' },
    begin: { text: '逼给', desc: '开始' },
    believe: { text: '逼里屋', desc: '相信' },
    bench: { text: '奔驰', desc: '长椅' },
    best: { text: '百斯特', desc: '最好的' },
    better: { text: '掰特', desc: '更好的' },
    bicycle: { text: '拜客', desc: '自行车' },
    big: { text: '比格', desc: '大的' },
    bird: { text: '伯德', desc: '鸟' },
    birthday: { text: '波丝带', desc: '生日' },
    black: { text: '布莱克', desc: '黑色的' },
    blue: { text: '布鲁', desc: '蓝色的' },
    book: { text: '布克', desc: '书' },
    box: { text: '博克斯', desc: '盒子' },
    boy: { text: '博伊', desc: '男孩' },
    bread: { text: '布雷德', desc: '面包' },
    breakfast: { text: '布雷克发斯特', desc: '早餐' },
    brother: { text: '布拉泽', desc: '兄弟' },
    bus: { text: '巴斯', desc: '公共汽车' },
    business: { text: '逼尼斯', desc: '商业' },
    buy: { text: '拜', desc: '买' },
    cake: { text: '凯克', desc: '蛋糕' },
    call: { text: '考尔', desc: '打电话' },
    car: { text: '卡尔', desc: '汽车' },
    card: { text: '卡尔德', desc: '卡片' },
    care: { text: '凯尔', desc: '关心' },
    cat: { text: '凯特', desc: '猫' },
    catch: { text: '凯奇', desc: '抓住' },
    chair: { text: '切尔', desc: '椅子' },
    change: { text: '陈杰', desc: '改变' },
    children: { text: '秋准', desc: '孩子们' },
    class: { text: '克拉斯', desc: '班级' },
    clean: { text: '克林', desc: '干净的' },
    clear: { text: '克莱尔', desc: '清楚的' },
    close: { text: '克洛斯', desc: '关闭' },
    cold: { text: '科尔德', desc: '冷的' },
    come: { text: '康姆', desc: '来' },
    color: { text: '科勒', desc: '颜色' },
    cook: { text: '库克', desc: '烹饪' },
    cool: { text: '库尔', desc: '酷的，凉爽的' },
    copy: { text: '考比', desc: '复制' },
    corner: { text: '科纳', desc: '角落' },
    cost: { text: '科斯特', desc: '花费' },
    cotton: { text: '卡顿', desc: '棉花' },
    country: { text: '康垂', desc: '国家' },
    cover: { text: '卡沃尔', desc: '覆盖' },
    cup: { text: '卡普', desc: '杯子' },
    cut: { text: '卡特', desc: '切' },
    dance: { text: '丹斯', desc: '跳舞' },
    dark: { text: '达克', desc: '黑暗的' },
    day: { text: '戴', desc: '天' },
    dear: { text: '迪尔', desc: '亲爱的' },
    death: { text: '戴斯', desc: '死亡' },
    desk: { text: '戴斯克', desc: '书桌' },
    dinner: { text: '迪纳', desc: '晚餐' },
    do: { text: '杜', desc: '做' },
    doctor: { text: '多特', desc: '医生' },
    dog: { text: '多格', desc: '狗' },
    door: { text: '多尔', desc: '门' },
    draw: { text: '卓', desc: '画画' },
    dream: { text: '垂姆', desc: '梦想' },
    dress: { text: '德莱斯', desc: '裙子' },
    drink: { text: '德林克', desc: '喝' },
    drive: { text: '德赖夫', desc: '驾驶' },
    dry: { text: '德莱', desc: '干的' },
    each: { text: '伊奇', desc: '每个' },
    early: { text: '厄尔利', desc: '早的' },
    earth: { text: '厄斯', desc: '地球' },
    easy: { text: '伊西', desc: '容易的' },
    eat: { text: '伊特', desc: '吃' },
    egg: { text: '艾格', desc: '鸡蛋' },
    eight: { text: '艾特', desc: '八' },
    elephant: { text: '埃里芬特', desc: '大象' },
    empty: { text: '埃姆普蒂', desc: '空的' },
    end: { text: '恩德', desc: '结束' },
    enjoy: { text: '恩乔伊', desc: '享受' },
    enough: { text: '伊纳夫', desc: '足够的' },
    enter: { text: '恩特', desc: '进入' },
    evening: { text: '伊夫宁', desc: '晚上' },
    every: { text: '埃夫里', desc: '每个' },
    example: { text: '伊格赞普', desc: '例子' },
    excuse: { text: '伊克斯库斯', desc: '原谅' },
    exercise: { text: '埃克赛斯', desc: '练习' },
    expensive: { text: '伊克斯潘斯夫', desc: '昂贵的' },
    eye: { text: '爱', desc: '眼睛' },
    face: { text: '费斯', desc: '脸' },
    family: { text: '范姆利', desc: '家庭' },
    far: { text: '法尔', desc: '远的' },
    fast: { text: '法斯特', desc: '快的' },
    father: { text: '法泽', desc: '父亲' },
    fear: { text: '菲尔', desc: '害怕' },
    feed: { text: '费德', desc: '喂' },
    feel: { text: '菲尔', desc: '感觉' },
    feet: { text: '菲特', desc: '脚' },
    field: { text: '菲尔德', desc: '田地' },
    find: { text: '法因德', desc: '找到' },
    fine: { text: '法因', desc: '好的' },
    fish: { text: '菲什', desc: '鱼' },
    five: { text: '法伊夫', desc: '五' },
    fly: { text: '弗莱', desc: '飞' },
    food: { text: '富德', desc: '食物' },
    foot: { text: '富特', desc: '脚' },
    forget: { text: '福盖特', desc: '忘记' },
    friend: { text: '弗兰德', desc: '朋友' },
    from: { text: '弗罗姆', desc: '从' },
    fruit: { text: '弗鲁特', desc: '水果' },
    fun: { text: '范', desc: '有趣的' },
    game: { text: '盖姆', desc: '游戏' },
    get: { text: '盖特', desc: '得到' },
    girl: { text: '格尔', desc: '女孩' },
    give: { text: '吉夫', desc: '给' },
    glass: { text: '格拉斯', desc: '玻璃' },
    go: { text: '高', desc: '去' },
    good: { text: '古德', desc: '好的' },
    goodbye: { text: '古德拜', desc: '再见' },
    green: { text: '格林', desc: '绿色的' },
    grow: { text: '格罗', desc: '生长' },
    hand: { text: '汉德', desc: '手' },
    happy: { text: '哈皮', desc: '快乐的' },
    hard: { text: '哈德', desc: '硬的，困难的' },
    have: { text: '哈夫', desc: '有' },
    head: { text: '海德', desc: '头' },
    hear: { text: '希尔', desc: '听见' },
    heavy: { text: '海维', desc: '重的' },
    help: { text: '赫尔普', desc: '帮助' },
    here: { text: '希尔', desc: '这里' },
    high: { text: '海', desc: '高的' },
    him: { text: '希姆', desc: '他' },
    his: { text: '希斯', desc: '他的' },
    hold: { text: '霍尔德', desc: '持有' },
    home: { text: '霍姆', desc: '家' },
    hope: { text: '霍普', desc: '希望' },
    hot: { text: '霍特', desc: '热的' },
    how: { text: '豪', desc: '怎样' },
    hungry: { text: '亨格瑞', desc: '饥饿的' },
    hurt: { text: '赫尔特', desc: '伤害' },
    ice: { text: '艾斯', desc: '冰' },
    idea: { text: '伊迪尔', desc: '主意' },
    if: { text: '伊夫', desc: '如果' },
    in: { text: '因', desc: '在...里面' },
    inside: { text: '因赛德', desc: '在里面' },
    into: { text: '因图', desc: '进入' },
    is: { text: '伊斯', desc: '是' },
    it: { text: '伊特', desc: '它' },
    its: { text: '伊特斯', desc: '它的' },
    job: { text: '乔布', desc: '工作' },
    join: { text: '乔因', desc: '加入' },
    jump: { text: '江普', desc: '跳' },
    keep: { text: '基普', desc: '保持' },
    key: { text: '基', desc: '钥匙' },
    kid: { text: '基德', desc: '孩子' },
    kind: { text: '凯因德', desc: '善良的' },
    know: { text: '诺', desc: '知道' },
    lake: { text: '莱克', desc: '湖' },
    land: { text: '兰德', desc: '土地' },
    late: { text: '莱特', desc: '晚的' },
    laugh: { text: '拉夫', desc: '笑' },
    learn: { text: '伦', desc: '学习' },
    leave: { text: '利夫', desc: '离开' },
    left: { text: '莱夫特', desc: '左边' },
    leg: { text: '莱格', desc: '腿' },
    let: { text: '莱特', desc: '让' },
    letter: { text: '莱特', desc: '字母，信' },
    like: { text: '莱克', desc: '喜欢' },
    line: { text: '莱恩', desc: '线' },
    listen: { text: '里森', desc: '听' },
    little: { text: '里特尔', desc: '小的' },
    long: { text: '朗', desc: '长的' },
    look: { text: '卢克', desc: '看' },
    love: { text: '拉夫', desc: '爱' },
    lunch: { text: '兰奇', desc: '午餐' },
    make: { text: '梅克', desc: '做' },
    man: { text: '曼', desc: '男人' },
    many: { text: '梅尼', desc: '许多' },
    map: { text: '麦普', desc: '地图' },
    mark: { text: '马克', desc: '标记' },
    match: { text: '麦奇', desc: '比赛，火柴' },
    meal: { text: '米尔', desc: '餐' },
    mean: { text: '米因', desc: '意思是' },
    meet: { text: '米特', desc: '遇见' },
    milk: { text: '米尔克', desc: '牛奶' },
    mind: { text: '麦因德', desc: '思想' },
    minute: { text: '米尼特', desc: '分钟' },
    miss: { text: '米斯', desc: '想念' },
    money: { text: '莫尼', desc: '钱' },
    morning: { text: '莫宁', desc: '早晨' },
    mother: { text: '妈泽', desc: '母亲' },
    move: { text: '穆夫', desc: '移动' },
    much: { text: '玛奇', desc: '许多' },
    music: { text: '缪克', desc: '音乐' },
    my: { text: '迈', desc: '我的' },
    name: { text: '内姆', desc: '名字' },
    near: { text: '尼尔', desc: '近的' },
    need: { text: '尼德', desc: '需要' },
    never: { text: '内弗', desc: '从不' },
    new: { text: '纽', desc: '新的' },
    next: { text: '奈克斯', desc: '下一个' },
    nice: { text: '奈斯', desc: '好的' },
    night: { text: '奈特', desc: '夜晚' },
    no: { text: '诺', desc: '不' },
    not: { text: '诺特', desc: '不' },
    now: { text: '瑙', desc: '现在' },
    number: { text: '南伯', desc: '数字' },
    of: { text: '奥夫', desc: '...的' },
    off: { text: '奥夫', desc: '离开' },
    often: { text: '奥夫顿', desc: '经常' },
    oh: { text: '哦', desc: '哦' },
    old: { text: '奥尔德', desc: '老的' },
    on: { text: '昂', desc: '在...上面' },
    once: { text: '万斯', desc: '一次' },
    one: { text: '万', desc: '一' },
    only: { text: '昂利', desc: '仅仅' },
    open: { text: '欧本', desc: '打开' },
    or: { text: '奥', desc: '或者' },
    order: { text: '奥尔德', desc: '命令，顺序' },
    our: { text: '奥乌尔', desc: '我们的' },
    out: { text: '奥特', desc: '出去' },
    over: { text: '奥弗', desc: '在...上面' },
    own: { text: '奥恩', desc: '自己的' },
    page: { text: '佩吉', desc: '页' },
    paper: { text: '佩珀', desc: '纸' },
    parent: { text: '佩伦', desc: '父母' },
    park: { text: '帕克', desc: '公园' },
    party: { text: '帕蒂', desc: '派对' },
    pass: { text: '帕斯', desc: '通过' },
    past: { text: '帕斯特', desc: '过去' },
    pay: { text: '佩', desc: '支付' },
    pen: { text: '佩恩', desc: '钢笔' },
    pencil: { text: '彭塞尔', desc: '铅笔' },
    people: { text: '皮普', desc: '人们' },
    phone: { text: '冯', desc: '电话' },
    piano: { text: '皮亚诺', desc: '钢琴' },
    pick: { text: '皮克', desc: '挑选' },
    picture: { text: '皮克图', desc: '图画' },
    place: { text: '普莱斯', desc: '地方' },
    play: { text: '普莱', desc: '玩' },
    please: { text: '普利兹', desc: '请' },
    point: { text: '波因特', desc: '点' },
    poor: { text: '普尔', desc: '贫穷的' },
    possible: { text: '波西布尔', desc: '可能的' },
    present: { text: '普瑞斯恩特', desc: '礼物' },
    problem: { text: '普罗布勒姆', desc: '问题' },
    pull: { text: '普尔', desc: '拉' },
    push: { text: '普什', desc: '推' },
    put: { text: '普特', desc: '放' },
    question: { text: '库艾森', desc: '问题' },
    quick: { text: '奎克', desc: '快的' },
    quiet: { text: '夸艾特', desc: '安静的' },
    read: { text: '瑞德', desc: '读' },
    red: { text: '瑞德', desc: '红色的' },
    remember: { text: '瑞曼伯', desc: '记住' },
    right: { text: '瑞特', desc: '右边，正确的' },
    river: { text: '瑞维', desc: '河流' },
    road: { text: '罗德', desc: '路' },
    room: { text: '鲁姆', desc: '房间' },
    run: { text: '润', desc: '跑' },
    say: { text: '塞', desc: '说' },
    school: { text: '斯库勒', desc: '学校' },
    sea: { text: '西', desc: '海' },
    see: { text: '西', desc: '看见' },
    second: { text: '塞肯德', desc: '第二' },
    send: { text: '森德', desc: '发送' },
    set: { text: '赛特', desc: '放置' },
    seven: { text: '塞文', desc: '七' },
    shake: { text: '谢克', desc: '摇动' },
    she: { text: '希', desc: '她' },
    shoe: { text: '舒', desc: '鞋' },
    short: { text: '肖特', desc: '短的' },
    show: { text: '肖', desc: '展示' },
    sing: { text: '辛', desc: '唱歌' },
    sister: { text: '西斯', desc: '姐妹' },
    sit: { text: '西特', desc: '坐' },
    sleep: { text: '斯利普', desc: '睡觉' },
    slow: { text: '斯洛', desc: '慢的' },
    small: { text: '斯莫尔', desc: '小的' },
    smile: { text: '斯迈尔', desc: '微笑' },
    snow: { text: '斯诺', desc: '雪' },
    so: { text: '索', desc: '所以' },
    some: { text: '萨姆', desc: '一些' },
    song: { text: '松', desc: '歌曲' },
    soon: { text: '苏恩', desc: '很快' },
    sorry: { text: '索瑞', desc: '对不起' },
    sound: { text: '桑德', desc: '声音' },
    speak: { text: '斯皮克', desc: '说话' },
    spell: { text: '斯佩尔', desc: '拼写' },
    spend: { text: '斯彭德', desc: '花费' },
    stand: { text: '斯丹德', desc: '站立' },
    start: { text: '斯塔尔', desc: '开始' },
    stay: { text: '斯泰', desc: '停留' },
    stop: { text: '斯多普', desc: '停止' },
    store: { text: '斯多瑞', desc: '商店' },
    story: { text: '斯多瑞', desc: '故事' },
    study: { text: '斯搭迪', desc: '学习' },
    such: { text: '萨奇', desc: '如此' },
    sure: { text: '舒尔', desc: '确定的' },
    table: { text: '泰布尔', desc: '桌子' },
    take: { text: '泰克', desc: '拿' },
    talk: { text: '托克', desc: '说话' },
    tall: { text: '托尔', desc: '高的' },
    tea: { text: '蒂', desc: '茶' },
    teach: { text: '蒂奇', desc: '教' },
    telephone: { text: '泰利冯', desc: '电话' },
    tell: { text: '泰尔', desc: '告诉' },
    ten: { text: '泰恩', desc: '十' },
    thank: { text: '桑克', desc: '感谢' },
    that: { text: '萨特', desc: '那个' },
    the: { text: '泽', desc: '这，那' },
    their: { text: '泽尔', desc: '他们的' },
    them: { text: '泽姆', desc: '他们' },
    then: { text: '泽恩', desc: '然后' },
    there: { text: '泽尔', desc: '那里' },
    these: { text: '泽斯', desc: '这些' },
    they: { text: '泽', desc: '他们' },
    think: { text: '辛克', desc: '想' },
    this: { text: '迪斯', desc: '这个' },
    those: { text: '泽斯', desc: '那些' },
    time: { text: '泰姆', desc: '时间' },
    to: { text: '图', desc: '到' },
    today: { text: '图迪', desc: '今天' },
    together: { text: '图盖泽', desc: '一起' },
    tomorrow: { text: '图莫罗', desc: '明天' },
    too: { text: '图', desc: '也' },
    two: { text: '图', desc: '二' },
    under: { text: '安德', desc: '在...下面' },
    up: { text: '阿普', desc: '向上' },
    us: { text: '阿斯', desc: '我们' },
    use: { text: '优斯', desc: '使用' },
    very: { text: '维瑞', desc: '非常' },
    visit: { text: '维兹特', desc: '访问' },
    wait: { text: '维特', desc: '等待' },
    walk: { text: '沃克', desc: '走' },
    want: { text: '万特', desc: '想要' },
    warm: { text: '沃姆', desc: '温暖的' },
    wash: { text: '沃什', desc: '洗' },
    water: { text: '沃特', desc: '水' },
    way: { text: '维', desc: '路' },
    we: { text: '维', desc: '我们' },
    well: { text: '威尔', desc: '好的' },
    what: { text: '沃特', desc: '什么' },
    when: { text: '温', desc: '什么时候' },
    where: { text: '威尔', desc: '哪里' },
    which: { text: '维奇', desc: '哪一个' },
    white: { text: '怀特', desc: '白色的' },
    who: { text: '胡', desc: '谁' },
    why: { text: '怀', desc: '为什么' },
    will: { text: '威尔', desc: '将要' },
    win: { text: '温', desc: '赢' },
    winter: { text: '温特', desc: '冬天' },
    with: { text: '维兹', desc: '和' },
    woman: { text: '沃曼', desc: '女人' },
    work: { text: '沃克', desc: '工作' },
    world: { text: '沃德', desc: '世界' },
    write: { text: '莱特', desc: '写' },
    wrong: { text: '朗', desc: '错误的' },
    year: { text: '伊尔', desc: '年' },
    yes: { text: '耶斯', desc: '是' },
    you: { text: '优', desc: '你' },
    young: { text: '杨', desc: '年轻的' },
    your: { text: '优尔', desc: '你的' },
    zero: { text: '泽罗', desc: '零' },
    zebra: { text: '泽布拉', desc: '斑马' },
    zoo: { text: '祖', desc: '动物园' }
}

const SYNONYM_MAP = {
    happy: ['glad', 'joyful', 'delighted', 'pleased'],
    sad: ['unhappy', 'sad', 'sorrowful', 'gloomy'],
    big: ['large', 'huge', 'enormous', 'giant'],
    small: ['little', 'tiny', 'minimal', 'petite'],
    beautiful: ['pretty', 'gorgeous', 'lovely', 'attractive'],
    ugly: ['hideous', 'unattractive', 'unsightly'],
    good: ['great', 'excellent', 'wonderful', 'fine'],
    bad: ['terrible', 'awful', 'poor', 'horrible'],
    fast: ['quick', 'rapid', 'swift', 'speedy'],
    slow: ['unhurried', 'leisurely', 'sluggish', 'tardy'],
    easy: ['simple', 'straightforward', 'effortless'],
    difficult: ['hard', 'challenging', 'complicated'],
    important: ['significant', 'essential', 'vital'],
    interesting: ['fascinating', 'engaging', 'captivating'],
    boring: ['dull', 'tedious', 'monotonous'],
    funny: ['amusing', 'hilarious', 'comical'],
    angry: ['furious', 'irate', 'annoyed'],
    afraid: ['scared', 'fearful', 'terrified'],
    hungry: ['starving', 'ravenous', 'famished'],
    thirsty: ['parched', 'dehydrated'],
    cold: ['chilly', 'freezing', 'frigid'],
    hot: ['warm', 'burning', 'scorching'],
    long: ['lengthy', 'extended', 'prolonged'],
    short: ['brief', 'concise', 'abbreviated'],
    tall: ['high', 'lofty', 'elevated'],
    wide: ['broad', 'spacious', 'extensive'],
    deep: ['profound', 'extensive', 'thorough'],
    high: ['tall', 'elevated', 'lofty'],
    low: ['short', 'depressed', 'humble'],
    new: ['fresh', 'recent', 'modern'],
    old: ['ancient', 'vintage', 'aged'],
    clean: ['neat', 'tidy', 'pure'],
    dirty: ['filthy', 'grimy', 'sordid'],
    bright: ['shining', 'luminous', 'radiant'],
    dark: ['dim', 'shadowy', 'gloomy'],
    soft: ['gentle', 'mild', 'tender'],
    hard: ['difficult', 'firm', 'tough'],
    sweet: ['sugary', 'honeyed', 'pleasant'],
    sour: ['acidic', 'tart', 'sharp'],
    bitter: ['acrid', 'harsh', 'pungent'],
    spicy: ['hot', 'fiery', 'aromatic'],
    salty: ['briny', 'saline'],
    noisy: ['loud', 'boisterous', 'clamorous'],
    quiet: ['silent', 'peaceful', 'tranquil'],
    busy: ['occupied', 'engaged', 'hectic'],
    lazy: ['indolent', 'sluggish', 'idle'],
    rich: ['wealthy', 'affluent', 'prosperous'],
    poor: ['destitute', 'needy', 'impoverished'],
    famous: ['renowned', 'celebrated', 'notorious'],
    unknown: ['obscure', 'unfamiliar', 'anonymous'],
    clever: ['smart', 'intelligent', 'bright'],
    stupid: ['foolish', 'silly', 'idiotic'],
    kind: ['friendly', 'nice', 'generous'],
    mean: ['cruel', 'unkind', 'rude'],
    honest: ['truthful', 'sincere', 'upright'],
    dishonest: ['deceitful', 'untruthful', 'fraudulent'],
    brave: ['courageous', 'fearless', 'bold'],
    cowardly: ['timid', 'fearful', 'afraid'],
    healthy: ['fit', 'well', 'vigorous'],
    sick: ['ill', 'unwell', 'ailing'],
    strong: ['powerful', 'muscular', 'robust'],
    weak: ['frail', 'feeble', 'delicate'],
    wise: ['intelligent', 'sagacious', 'astute'],
    foolish: ['stupid', 'silly', 'unwise'],
    lucky: ['fortunate', 'blessed', 'favored'],
    unlucky: ['unfortunate', 'cursed', 'jinxed'],
    early: ['prompt', 'timely', 'premature'],
    late: ['delayed', 'tardy', 'overdue'],
    full: ['complete', 'filled', 'replete'],
    empty: ['vacant', 'hollow', 'devoid'],
    safe: ['secure', 'protected', 'unharmed'],
    dangerous: ['hazardous', 'risky', 'perilous'],
    correct: ['right', 'accurate', 'proper'],
    wrong: ['incorrect', 'mistaken', 'erroneous'],
    true: ['real', 'genuine', 'authentic'],
    false: ['untrue', 'fake', 'artificial'],
    possible: ['feasible', 'achievable', 'attainable'],
    impossible: ['unfeasible', 'unachievable', 'hopeless'],
    usual: ['common', 'normal', 'regular'],
    unusual: ['uncommon', 'abnormal', 'rare'],
    same: ['identical', 'similar', 'alike'],
    different: ['distinct', 'various', 'diverse'],
    alone: ['solitary', 'lonely', 'isolated'],
    together: ['united', 'joint', 'concurrent'],
    always: ['constantly', 'permanently', 'forever'],
    never: ['never', 'not ever', 'at no time'],
    often: ['frequently', 'regularly', 'repeatedly'],
    rarely: ['seldom', 'infrequently', 'scarcely'],
    quickly: ['rapidly', 'swiftly', 'fast'],
    slowly: ['gradually', 'leisurely', 'unhurriedly'],
    carefully: ['cautiously', 'prudently', 'attentively'],
    carelessly: ['recklessly', 'thoughtlessly', 'negligently'],
    happily: ['joyfully', 'gladly', 'cheerfully'],
    sadly: ['unhappily', 'sorrowfully', 'melancholically'],
    angrily: ['furious', 'irately', 'enraged'],
    quietly: ['silently', 'peacefully', 'softly'],
    loudly: ['noisily', 'boisterously', 'clamorously'],
    clearly: ['distinctly', 'obviously', 'apparently'],
    correctly: ['accurately', 'properly', 'rightly'],
    wrongly: ['incorrectly', 'mistakenly', 'erroneously'],
    fully: ['completely', 'entirely', 'totally'],
    partly: ['partially', 'incompletely', 'somewhat'],
    mostly: ['mainly', 'predominantly', 'largely'],
    mainly: ['primarily', 'principally', 'chiefly'],
    really: ['truly', 'genuinely', 'actually'],
    very: ['extremely', 'highly', 'greatly'],
    too: ['also', 'as well', 'excessively'],
    enough: ['sufficiently', 'adequately', 'amply'],
    just: ['exactly', 'precisely', 'merely'],
    only: ['solely', 'exclusively', 'merely'],
    also: ['too', 'as well', 'additionally'],
    even: ['also', 'furthermore', 'moreover'],
    still: ['yet', 'nevertheless', 'nonetheless'],
    already: ['previously', 'before', 'earlier'],
    yet: ['still', 'nevertheless', 'however'],
    almost: ['nearly', 'practically', 'virtually'],
    nearly: ['almost', 'practically', 'virtually'],
    hardly: ['barely', 'scarcely', 'rarely'],
    barely: ['hardly', 'scarcely', 'just'],
    scarcely: ['hardly', 'barely', 'rarely'],
    totally: ['completely', 'entirely', 'fully'],
    completely: ['totally', 'entirely', 'fully'],
    entirely: ['totally', 'completely', 'fully'],
    absolutely: ['definitely', 'certainly', 'positively'],
    definitely: ['absolutely', 'certainly', 'surely'],
    certainly: ['definitely', 'absolutely', 'surely'],
    probably: ['likely', 'possibly', 'perhaps'],
    possibly: ['probably', 'maybe', 'perhaps'],
    maybe: ['perhaps', 'possibly', 'probably'],
    perhaps: ['maybe', 'possibly', 'probably'],
    surely: ['certainly', 'definitely', 'undoubtedly'],
    actually: ['really', 'genuinely', 'truly'],
    basically: ['essentially', 'fundamentally', 'principally'],
    generally: ['usually', 'normally', 'typically'],
    specifically: ['particularly', 'especially', 'precisely'],
    particularly: ['especially', 'specifically', 'notably'],
    especially: ['particularly', 'specifically', 'notably'],
    finally: ['eventually', 'ultimately', 'at last'],
    eventually: ['finally', 'ultimately', 'in the end'],
    initially: ['originally', 'at first', 'beginning'],
    originally: ['initially', 'at first', 'primitively'],
    previously: ['before', 'earlier', 'formerly'],
    recently: ['lately', 'newly', 'recently'],
    currently: ['presently', 'now', 'at present'],
    presently: ['currently', 'now', 'at present'],
    suddenly: ['abruptly', 'quickly', 'unexpectedly'],
    gradually: ['slowly', 'progressively', 'step by step'],
    immediately: ['instantly', 'promptly', 'right away'],
    instantly: ['immediately', 'promptly', 'right away'],
    promptly: ['immediately', 'instantly', 'quickly'],
    shortly: ['soon', 'briefly', 'in a short time'],
    soon: ['shortly', 'quickly', 'before long'],
    later: ['afterward', 'subsequently', 'following'],
    early: ['soon', 'promptly', 'quickly'],
    late: ['delayed', 'tardy', 'overdue'],
    today: ['now', 'currently', 'presently'],
    tomorrow: ['the next day', 'in the future', 'later'],
    yesterday: ['the previous day', 'earlier', 'before'],
    tonight: ['this evening', 'at night', 'tonight'],
    morning: ['dawn', 'early', 'daybreak'],
    afternoon: ['midday', 'noon', 'afternoon'],
    evening: ['nightfall', 'dusk', 'twilight'],
    night: ['dark', 'evening', 'nighttime'],
    week: ['seven days', 'weekly', 'period'],
    month: ['four weeks', 'monthly', 'period'],
    year: ['twelve months', 'yearly', 'period'],
    hour: ['sixty minutes', 'hourly', 'period'],
    minute: ['sixty seconds', 'minutely', 'period'],
    second: ['sixtyth of a minute', 'briefly', 'moment'],
    first: ['initial', 'primary', 'beginning'],
    second: ['next', 'subsequent', 'following'],
    third: ['next', 'subsequent', 'following'],
    fourth: ['next', 'subsequent', 'following'],
    fifth: ['next', 'subsequent', 'following'],
    last: ['final', 'end', 'concluding'],
    next: ['following', 'subsequent', 'upcoming'],
    previous: ['before', 'prior', 'earlier'],
    this: ['current', 'present', 'this one'],
    that: ['previous', 'aforementioned', 'that one'],
    these: ['current', 'present', 'these ones'],
    those: ['previous', 'aforementioned', 'those ones'],
    such: ['like', 'similar', 'of this kind'],
    so: ['thus', 'therefore', 'consequently'],
    as: ['like', 'similar to', 'in the manner of'],
    merely: ['only', 'just', 'simply'],
    simply: ['merely', 'just', 'only'],
    principally: ['mainly', 'primarily', 'chiefly'],
    largely: ['mainly', 'principally', 'mostly'],
    widely: ['extensively', 'broadly', 'generally'],
    commonly: ['usually', 'frequently', 'generally'],
    normally: ['usually', 'commonly', 'typically'],
    typically: ['usually', 'normally', 'commonly'],
    regularly: ['usually', 'frequently', 'consistently'],
    routinely: ['regularly', 'habitually', 'usually'],
    habitually: ['routinely', 'regularly', 'usually'],
    consistently: ['regularly', 'constantly', 'steadily'],
    frequently: ['often', 'regularly', 'repeatedly'],
    occasionally: ['sometimes', 'infrequently', 'sporadically'],
    seldom: ['rarely', 'hardly ever', 'infrequently'],
    ever: ['at any time', 'always', 'constantly'],
    forever: ['always', 'permanently', 'eternally'],
    permanently: ['forever', 'always', 'constantly'],
    temporarily: ['briefly', 'momentarily', 'for a time'],
    briefly: ['temporarily', 'momentarily', 'shortly'],
    momentarily: ['briefly', 'temporarily', 'instantly'],
    abruptly: ['suddenly', 'quickly', 'unexpectedly'],
    rapidly: ['quickly', 'swiftly', 'fast'],
    swiftly: ['quickly', 'rapidly', 'fast'],
    hastily: ['quickly', 'rashly', 'carelessly'],
    cautiously: ['carefully', 'prudently', 'warily'],
    deliberately: ['intentionally', 'purposefully', 'on purpose'],
    intentionally: ['deliberately', 'purposefully', 'on purpose'],
    purposefully: ['deliberately', 'intentionally', 'on purpose'],
    accidentally: ['unintentionally', 'mistakenly', 'by chance'],
    unintentionally: ['accidentally', 'mistakenly', 'inadvertently'],
    inadvertently: ['unintentionally', 'accidentally', 'mistakenly'],
    incidentally: ['accidentally', 'by chance', 'casually'],
    randomly: ['arbitrarily', 'haphazardly', 'without pattern'],
    arbitrarily: ['randomly', 'haphazardly', 'without reason'],
    spontaneously: ['naturally', 'instinctively', 'without planning'],
    naturally: ['spontaneously', 'instinctively', 'automatically'],
    mechanically: ['automatically', 'robotically', 'without thought'],
    artificially: ['unnaturally', 'synthetically', 'man-made'],
    synthetically: ['artificially', 'chemically', 'man-made'],
    chemically: ['synthetically', 'artificially', 'laboratory-made'],
    biologically: ['naturally', 'organically', 'living'],
    physically: ['bodily', 'materially', 'tangibly'],
    mentally: ['psychologically', 'intellectually', 'cognitively'],
    emotionally: ['affectively', 'feelingly', 'sentimentally'],
    psychologically: ['mentally', 'emotionally', 'psychically'],
    spiritually: ['religiously', 'morally', 'ethically'],
    morally: ['ethically', 'righteously', 'virtuously'],
    ethically: ['morally', 'righteously', 'virtuously'],
    legally: ['lawfully', 'legitimately', 'licitly'],
    politically: ['governmentally', 'administratively', 'socially'],
    economically: ['financially', 'commercially', 'monetarily'],
    socially: ['communally', 'interpersonally', 'culturally'],
    culturally: ['socially', 'traditionally', 'customarily'],
    historically: ['traditionally', 'formerly', 'heretofore'],
    geographically: ['spatially', 'regionally', 'locally'],
    technologically: ['scientifically', 'mechanically', 'digitally'],
    scientifically: ['technologically', 'rationally', 'empirically'],
    mathematically: ['numerically', 'quantitatively', 'calculably'],
    statistically: ['numerically', 'quantitatively', 'probabilistically'],
    logically: ['rationally', 'reasonably', 'sensibly'],
    rationally: ['logically', 'reasonably', 'sensibly'],
    reasonably: ['logically', 'rationally', 'sensibly'],
    plausibly: ['credibly', 'believably', 'reasonably'],
    credibly: ['plausibly', 'believably', 'trustworthily'],
    believably: ['plausibly', 'credibly', 'convincingly'],
    unbelievably: ['incredibly', 'amazingly', 'astonishingly'],
    incredibly: ['unbelievably', 'amazingly', 'astonishingly'],
    amazingly: ['unbelievably', 'incredibly', 'astonishingly'],
    astonishingly: ['unbelievably', 'incredibly', 'amazingly'],
    surprisingly: ['unexpectedly', 'amazingly', 'astonishingly'],
    unexpectedly: ['surprisingly', 'amazingly', 'unanticipated'],
    predictably: ['expectedly', 'reasonably', 'logically'],
    inevitably: ['necessarily', 'unavoidably', 'certainly'],
    positively: ['absolutely', 'definitely', 'certainly'],
    undoubtedly: ['certainly', 'definitely', 'surely'],
    unquestionably: ['undoubtedly', 'certainly', 'definitely'],
    indubitably: ['undoubtedly', 'certainly', 'definitely'],
    decidedly: ['definitely', 'certainly', 'clearly'],
    distinctly: ['clearly', 'obviously', 'unmistakably'],
    clearly: ['distinctly', 'obviously', 'apparently'],
    evidently: ['clearly', 'obviously', 'apparently'],
    apparently: ['clearly', 'evidently', 'seemingly'],
    seemingly: ['apparently', 'ostensibly', 'supposedly'],
    ostensibly: ['seemingly', 'apparently', 'purportedly'],
    purportedly: ['ostensibly', 'apparently', 'allegedly'],
    allegedly: ['purportedly', 'reportedly', 'supposedly'],
    reportedly: ['allegedly', 'supposedly', 'purportedly'],
    supposedly: ['reportedly', 'allegedly', 'purportedly'],
    presumably: ['probably', 'likely', 'supposedly'],
    likely: ['probably', 'possibly', 'presumably'],
    potentially: ['possibly', 'conceivably', 'possibly'],
    conceivably: ['potentially', 'possibly', 'imaginably'],
    practically: ['virtually', 'almost', 'nearly'],
    virtually: ['practically', 'almost', 'nearly'],
    effectively: ['practically', 'virtually', 'essentially'],
    inherently: ['intrinsically', 'naturally', 'essentially'],
    intrinsically: ['inherently', 'naturally', 'essentially'],
    extrinsically: ['externally', 'outwardly', 'superficially'],
    externally: ['extrinsically', 'outwardly', 'superficially'],
    internally: ['inwardly', 'internally', 'intimately'],
    globally: ['internationally', 'worldwide', 'universally'],
    nationally: ['countrywide', 'nationally', 'domestically'],
    internationally: ['globally', 'worldwide', 'universally'],
    regionally: ['locally', 'geographically', 'area-wise'],
    wise: ['intelligent', 'sagacious', 'astute'],
    uncle: ['uncle', 'aunt', 'relative'],
    aunt: ['aunt', 'uncle', 'relative'],
    cousin: ['cousin', 'relative', 'family'],
    nephew: ['nephew', 'niece', 'relative'],
    niece: ['niece', 'nephew', 'relative'],
    grandfather: ['grandfather', 'grandmother', 'grandparent'],
    grandmother: ['grandmother', 'grandfather', 'grandparent']
}

const ANTONYM_MAP = {
    happy: 'sad',
    sad: 'happy',
    big: 'small',
    small: 'big',
    beautiful: 'ugly',
    ugly: 'beautiful',
    good: 'bad',
    bad: 'good',
    fast: 'slow',
    slow: 'fast',
    easy: 'difficult',
    difficult: 'easy',
    important: 'unimportant',
    interesting: 'boring',
    boring: 'interesting',
    funny: 'serious',
    angry: 'calm',
    afraid: 'brave',
    hungry: 'full',
    thirsty: 'satisfied',
    cold: 'hot',
    hot: 'cold',
    long: 'short',
    short: 'long',
    tall: 'short',
    wide: 'narrow',
    deep: 'shallow',
    high: 'low',
    low: 'high',
    new: 'old',
    old: 'new',
    clean: 'dirty',
    dirty: 'clean',
    bright: 'dark',
    dark: 'bright',
    soft: 'hard',
    hard: 'soft',
    sweet: 'sour',
    noisy: 'quiet',
    quiet: 'noisy',
    busy: 'lazy',
    lazy: 'busy',
    rich: 'poor',
    poor: 'rich',
    famous: 'unknown',
    unknown: 'famous',
    clever: 'stupid',
    stupid: 'clever',
    kind: 'mean',
    mean: 'kind',
    honest: 'dishonest',
    dishonest: 'honest',
    brave: 'cowardly',
    cowardly: 'brave',
    healthy: 'sick',
    sick: 'healthy',
    strong: 'weak',
    weak: 'strong',
    wise: 'foolish',
    foolish: 'wise',
    lucky: 'unlucky',
    unlucky: 'lucky',
    early: 'late',
    late: 'early',
    full: 'empty',
    empty: 'full',
    safe: 'dangerous',
    dangerous: 'safe',
    correct: 'wrong',
    wrong: 'correct',
    true: 'false',
    false: 'true',
    possible: 'impossible',
    impossible: 'possible',
    usual: 'unusual',
    unusual: 'usual',
    same: 'different',
    different: 'same',
    alone: 'together',
    together: 'alone',
    always: 'never',
    never: 'always',
    often: 'rarely',
    rarely: 'often',
    quickly: 'slowly',
    slowly: 'quickly',
    carefully: 'carelessly',
    carelessly: 'carefully',
    happily: 'sadly',
    sadly: 'happily',
    quietly: 'loudly',
    loudly: 'quietly',
    clearly: 'vaguely',
    vaguely: 'clearly',
    completely: 'partially',
    partially: 'completely',
    absolutely: 'doubtfully',
    doubtfully: 'absolutely',
    certainly: 'uncertainly',
    uncertainly: 'certainly',
    probably: 'unlikely',
    unlikely: 'probably',
    actually: 'apparently',
    apparently: 'actually',
    basically: 'specifically',
    specifically: 'basically',
    generally: 'specifically',
    finally: 'initially',
    initially: 'finally',
    originally: 'eventually',
    eventually: 'originally',
    previously: 'currently',
    currently: 'previously',
    recently: 'formerly',
    formerly: 'recently',
    suddenly: 'gradually',
    gradually: 'suddenly',
    immediately: 'slowly',
    slowly: 'immediately',
    soon: 'late',
    late: 'soon',
    today: 'yesterday',
    yesterday: 'today',
    morning: 'evening',
    evening: 'morning',
    this: 'that',
    that: 'this',
    these: 'those',
    those: 'these',
    yes: 'no',
    no: 'yes',
    up: 'down',
    down: 'up',
    in: 'out',
    out: 'in',
    on: 'off',
    off: 'on',
    open: 'close',
    close: 'open',
    start: 'stop',
    stop: 'start',
    begin: 'end',
    end: 'begin',
    arrive: 'depart',
    depart: 'arrive',
    come: 'go',
    go: 'come',
    buy: 'sell',
    sell: 'buy',
    borrow: 'lend',
    lend: 'borrow',
    remember: 'forget',
    forget: 'remember',
    love: 'hate',
    hate: 'love',
    like: 'dislike',
    dislike: 'like',
    give: 'take',
    take: 'give',
    push: 'pull',
    pull: 'push',
    rise: 'fall',
    fall: 'rise',
    increase: 'decrease',
    decrease: 'increase',
    accept: 'reject',
    reject: 'accept',
    allow: 'forbid',
    forbid: 'allow',
    agree: 'disagree',
    disagree: 'agree',
    believe: 'doubt',
    doubt: 'believe',
    create: 'destroy',
    destroy: 'create',
    find: 'lose',
    lose: 'find',
    help: 'harm',
    harm: 'help',
    include: 'exclude',
    exclude: 'include',
    join: 'leave',
    leave: 'join',
    keep: 'lose',
    lose: 'keep',
    know: 'ignore',
    ignore: 'know',
    laugh: 'cry',
    cry: 'laugh',
    learn: 'forget',
    forget: 'learn',
    live: 'die',
    die: 'live',
    make: 'break',
    break: 'make',
    open: 'close',
    close: 'open',
    pass: 'fail',
    fail: 'pass',
    praise: 'criticize',
    criticize: 'praise',
    save: 'waste',
    waste: 'save',
    speak: 'silence',
    silence: 'speak',
    succeed: 'fail',
    fail: 'succeed',
    trust: 'distrust',
    distrust: 'trust',
    use: 'abuse',
    abuse: 'use',
    win: 'lose',
    lose: 'win',
    work: 'rest',
    rest: 'work',
    write: 'erase',
    erase: 'write',
    young: 'old',
    old: 'young',
    long: 'short',
    short: 'long',
    wide: 'narrow',
    narrow: 'wide',
    deep: 'shallow',
    shallow: 'deep',
    thick: 'thin',
    thin: 'thick',
    heavy: 'light',
    light: 'heavy',
    rough: 'smooth',
    smooth: 'rough',
    wet: 'dry',
    dry: 'wet',
    warm: 'cool',
    cool: 'warm',
    sharp: 'dull',
    dull: 'sharp',
    tight: 'loose',
    loose: 'tight',
    weak: 'strong',
    strong: 'weak',
    small: 'large',
    large: 'small',
    few: 'many',
    many: 'few',
    little: 'much',
    much: 'little',
    some: 'none',
    none: 'some',
    all: 'none',
    every: 'none',
    both: 'neither',
    neither: 'both',
    each: 'none',
    another: 'same',
    same: 'another',
    other: 'same',
    such: 'different',
    different: 'such',
    enough: 'insufficient',
    insufficient: 'enough',
    too: 'not enough',
    not: 'yes',
    yes: 'no',
    only: 'many',
    many: 'only',
    also: 'only',
    even: 'never',
    never: 'always',
    still: 'already',
    already: 'still',
    yet: 'already',
    almost: 'completely',
    completely: 'partially',
    nearly: 'completely',
    hardly: 'completely',
    barely: 'completely',
    scarcely: 'completely',
    totally: 'partially',
    entirely: 'partially',
    absolutely: 'doubtfully',
    definitely: 'possibly',
    possibly: 'definitely',
    maybe: 'definitely',
    perhaps: 'definitely',
    surely: 'doubtfully',
    actually: 'apparently',
    basically: 'specifically',
    generally: 'specifically',
    finally: 'initially',
    eventually: 'initially',
    originally: 'currently',
    previously: 'currently',
    recently: 'formerly',
    currently: 'formerly',
    suddenly: 'gradually',
    gradually: 'suddenly',
    immediately: 'slowly',
    promptly: 'slowly',
    shortly: 'long',
    soon: 'late',
    later: 'early',
    early: 'late',
    today: 'yesterday',
    tomorrow: 'yesterday',
    tonight: 'this morning',
    morning: 'evening',
    afternoon: 'morning',
    evening: 'morning',
    night: 'day',
    day: 'night',
    week: 'day',
    month: 'week',
    year: 'month',
    hour: 'minute',
    minute: 'hour',
    second: 'minute',
    first: 'last',
    last: 'first',
    next: 'previous',
    previous: 'next',
    this: 'that',
    that: 'this',
    these: 'those',
    those: 'these',
    such: 'different',
    different: 'such',
    so: 'not so',
    as: 'not as',
    merely: 'completely',
    simply: 'complexly',
    principally: 'secondarily',
    largely: 'slightly',
    widely: 'narrowly',
    commonly: 'rarely',
    normally: 'abnormally',
    typically: 'atypically',
    regularly: 'irregularly',
    routinely: 'sporadically',
    habitually: 'occasionally',
    consistently: 'inconsistently',
    frequently: 'infrequently',
    occasionally: 'frequently',
    seldom: 'often',
    ever: 'never',
    forever: 'temporarily',
    permanently: 'temporarily',
    temporarily: 'permanently',
    briefly: 'lengthily',
    momentarily: 'permanently',
    abruptly: 'smoothly',
    rapidly: 'slowly',
    swiftly: 'slowly',
    hastily: 'carefully',
    cautiously: 'recklessly',
    deliberately: 'accidentally',
    intentionally: 'unintentionally',
    purposefully: 'accidentally',
    accidentally: 'intentionally',
    unintentionally: 'intentionally',
    inadvertently: 'deliberately',
    incidentally: 'purposefully',
    randomly: 'systematically',
    arbitrarily: 'systematically',
    spontaneously: 'deliberately',
    naturally: 'artificially',
    mechanically: 'creatively',
    artificially: 'naturally',
    synthetically: 'naturally',
    chemically: 'naturally',
    biologically: 'artificially',
    physically: 'mentally',
    mentally: 'physically',
    emotionally: 'rationally',
    psychologically: 'physically',
    spiritually: 'materially',
    morally: 'immorally',
    ethically: 'unethically',
    legally: 'illegally',
    politically: 'apolitically',
    economically: 'uneconomically',
    socially: 'antisocially',
    culturally: 'unculturally',
    historically: 'ahistorically',
    geographically: 'ungeographically',
    technologically: 'untechnologically',
    scientifically: 'unscientifically',
    mathematically: 'approximately',
    statistically: 'anecdotally',
    logically: 'illogically',
    rationally: 'irrationally',
    reasonably: 'unreasonably',
    plausibly: 'implausibly',
    credibly: 'incredibly',
    believably: 'unbelievably',
    unbelievably: 'believably',
    incredibly: 'credibly',
    amazingly: 'ordinarily',
    astonishingly: 'predictably',
    surprisingly: 'predictably',
    unexpectedly: 'expectedly',
    predictably: 'unexpectedly',
    inevitably: 'avoidably',
    positively: 'negatively',
    undoubtedly: 'doubtfully',
    unquestionably: 'questionably',
    indubitably: 'dubiously',
    decidedly: 'undecidedly',
    distinctly: 'vaguely',
    clearly: 'unclearly',
    evidently: 'unevidently',
    apparently: 'unapparently',
    seemingly: 'actually',
    ostensibly: 'actually',
    purportedly: 'actually',
    allegedly: 'confirmedly',
    reportedly: 'directly',
    supposedly: 'confirmedly',
    presumably: 'certainly',
    likely: 'unlikely',
    potentially: 'actually',
    conceivably: 'inconceivably',
    practically: 'theoretically',
    virtually: 'actually',
    effectively: 'ineffectively',
    inherently: 'extrinsically',
    intrinsically: 'extrinsically',
    extrinsically: 'intrinsically',
    externally: 'internally',
    internally: 'externally',
    globally: 'locally',
    nationally: 'locally',
    internationally: 'locally',
    regionally: 'globally',
    wise: 'foolish',
    foolish: 'wise',
    uncle: 'aunt',
    aunt: 'uncle',
    cousin: 'stranger',
    stranger: 'friend',
    friend: 'enemy',
    enemy: 'friend',
    brother: 'sister',
    sister: 'brother',
    father: 'mother',
    mother: 'father',
    son: 'daughter',
    daughter: 'son',
    husband: 'wife',
    wife: 'husband',
    grandfather: 'grandmother',
    grandmother: 'grandfather'
}

const WORD_SCENES = {
    elephant: '长鼻子、大耳朵的巨型大象在草原上散步',
    umbrella: '下雨天撑开雨伞遮挡雨水',
    rainbow: '雨后天空出现七彩彩虹',
    snowman: '冬天堆一个可爱的雪人',
    icecream: '夏天吃美味的冰淇淋',
    butterfly: '彩色蝴蝶在花丛中飞舞',
    flower: '花园里盛开的美丽花朵',
    bird: '小鸟在树上唱歌',
    dog: '小狗在草地上奔跑玩耍',
    cat: '猫咪在沙发上睡觉',
    fish: '鱼儿在水里自由自在地游泳',
    sun: '太阳照耀着大地',
    moon: '月亮在夜空中发光',
    star: '星星在天空中闪烁',
    rain: '雨滴从天上落下来',
    snow: '雪花轻轻地飘落',
    tree: '大树长得又高又壮',
    mountain: '高高的山峰直插云霄',
    river: '河水哗哗地流淌',
    ocean: '蓝色的大海波涛汹涌',
    beach: '金色的沙滩和蓝色的大海',
    car: '汽车在马路上行驶',
    bus: '公交车载着乘客',
    bike: '骑着自行车去公园',
    train: '火车在铁轨上飞驰',
    airplane: '飞机在天空中飞翔',
    boat: '小船在河面上飘荡',
    book: '在图书馆里看书',
    school: '孩子们背着书包去上学',
    house: '温暖的家',
    bed: '舒舒服服地躺在床上',
    table: '一家人围坐在桌子旁吃饭',
    chair: '坐在椅子上休息',
    food: '美味的食物',
    apple: '红红的苹果',
    banana: '弯弯的香蕉',
    orange: '甜甜的橙子',
    cake: '生日蛋糕',
    bread: '香喷喷的面包',
    milk: '喝牛奶',
    water: '口渴了喝水',
    tea: '喝一杯热茶',
    coffee: '香浓的咖啡',
    juice: '新鲜的果汁',
    egg: '早餐吃鸡蛋',
    rice: '米饭',
    meat: '吃肉',
    soup: '喝汤',
    salad: '蔬菜沙拉',
    pizza: '美味的披萨',
    hamburger: '汉堡包',
    chocolate: '巧克力',
    candy: '糖果',
    toy: '玩具',
    ball: '球',
    game: '玩游戏',
    music: '听音乐',
    dance: '跳舞',
    sing: '唱歌',
    run: '跑步',
    jump: '跳高',
    swim: '游泳',
    fly: '像小鸟一样飞',
    walk: '散步',
    sleep: '睡觉',
    dream: '做梦',
    smile: '微笑',
    cry: '哭泣',
    laugh: '大笑',
    love: '爱',
    happy: '开心',
    sad: '伤心',
    angry: '生气',
    afraid: '害怕',
    hungry: '饿',
    thirsty: '渴',
    tired: '累',
    cold: '冷',
    hot: '热',
    warm: '温暖',
    cool: '凉爽',
    beautiful: '美丽',
    ugly: '丑陋',
    big: '大',
    small: '小',
    long: '长',
    short: '短',
    tall: '高',
    fast: '快',
    slow: '慢',
    good: '好',
    bad: '坏',
    new: '新',
    old: '旧',
    clean: '干净',
    dirty: '脏',
    bright: '明亮',
    dark: '黑暗',
    soft: '柔软',
    hard: '坚硬',
    sweet: '甜',
    sour: '酸',
    bitter: '苦',
    spicy: '辣',
    salty: '咸'
}

const ETYMOLOGY_MAP = {
    salary: { text: '来自拉丁语 salarium，古罗马士兵发盐作为酬劳 → 盐钱 → 薪水', tip: null },
    companion: { text: 'com(一起) + pan(面包) → 一起吃面包的人 → 同伴', tip: null },
    disaster: { text: 'dis(否定) + aster(星) → 星位不正 → 灾难（古人迷信星象）', tip: null },
    breakfast: { text: 'break(打破) + fast(斋戒) → 打破一夜的斋戒 → 早餐', tip: null },
    sandwich: { text: '来自约翰·蒙塔古伯爵的绰号"三明治"，他为了赌博让人把肉夹在面包里', tip: null },
    window: { text: '古挪威语 vindr(风) + auga(眼睛) → 风的眼睛 → 窗户', tip: null },
    clock: { text: '源自中古英语 clokke，最初指教堂的钟 → 时钟', tip: null },
    robot: { text: '源自捷克语 robota(强制劳动) → 机器人', tip: null },
    quilt: { text: '源自拉丁语 culcita(床垫) → 缝起来的被子', tip: null },
    disaster: { text: 'dis(不) + aster(星) → 星位不正 → 灾难', tip: null },
    import: { text: 'im(进入) + port(搬运) → 搬进来 → 进口', tip: null },
    export: { text: 'ex(出去) + port(搬运) → 搬出去 → 出口', tip: null },
    report: { text: 're(再次) + port(搬运) → 再次搬运信息 → 报告', tip: null },
    support: { text: 'sub(下面) + port(搬运) → 从下面支撑 → 支持', tip: null },
    transport: { text: 'trans(跨越) + port(搬运) → 跨越搬运 → 运输', tip: null },
    portable: { text: 'port(搬运) + able(能) → 能搬运的 → 便携的', tip: null },
    evidence: { text: 'e(出) + vid(看) + ence → 看出来的东西 → 证据', tip: null },
    provide: { text: 'pro(向前) + vid(看) + e → 提前看到需求 → 提供', tip: null },
    revise: { text: 're(再次) + vis(看) + e → 再看一遍 → 修订', tip: null },
    supervise: { text: 'super(上面) + vis(看) + e → 从上往下看 → 监督', tip: null },
    television: { text: 'tele(远) + vis(看) + ion → 远方看到 → 电视', tip: null }
}

const TPR_ACTIONS = {
    jump: '双脚用力蹬地，向上跳起',
    run: '快速交替迈步，向前奔跑',
    walk: '自然交替迈步，向前行走',
    open: '双手做出推开门/掀开盖子的动作',
    close: '双手做出拉门/合盖的动作',
    carry: '双手抱重物在胸前，迈步前行',
    whisper: '凑近耳边，捂嘴小声说话',
    shout: '张大嘴巴，用力呼喊',
    eat: '拿起食物，放入口中咀嚼',
    drink: '端起杯子，凑到嘴边饮用',
    write: '手握笔状，在纸上书写',
    read: '双手捧书，眼睛扫动阅读',
    push: '双手用力向前推',
    pull: '双手用力向后拉',
    lift: '弯腰屈膝，双手向上举起',
    throw: '挥手向前抛掷',
    catch: '双手向前伸出抓取',
    climb: '手脚并用向上攀登',
    swim: '双臂划水，双腿蹬水',
    dance: '身体随节奏摆动，手脚舞动',
    sing: '嘴巴张开，发出旋律',
    sleep: '双手合十放耳边，闭眼打哈欠',
    cry: '双手揉眼睛，假装流泪',
    laugh: '双手捂肚子，弯腰大笑',
    smell: '凑近物体，用力吸气',
    taste: '舌尖舔嘴唇，品味味道',
    touch: '手指轻触物体表面',
    feel: '手掌按在胸口，闭眼感受',
    hide: '双手捂脸，蹲低身体',
    seek: '手搭凉棚，四处张望',
    escape: '急促摆手，向后退避',
    hurry: '快步走动，频繁看手表',
    wait: '双手交叠身前，耐心等候',
    stop: '张开手掌，发出停止手势',
    start: '挥手向前，做出开始手势',
    sit: '屈膝坐下，身体放松',
    stand: '向上挺直身体，双脚站立',
    lie: '身体躺平，双手放身侧',
    fight: '双拳出击，交替攻防',
    protect: '双手交叉护在胸前',
    attack: '双拳向前猛击',
    escape: '转身奔跑，快速离开'
}

const LETTER_PICTOGRAM = {
    a: '山尖似A，人字梯',
    b: '眼镜似B，两个圆',
    c: '弯月似C，开口笑',
    d: '半圆弓似D',
    e: '梳子似E，三横',
    f: '旗杆似F',
    g: '门环似G',
    h: '梯子似H',
    i: '柱子似I，蜡烛',
    j: '钩子似J',
    k: '踢腿似K',
    l: '直角尺似L',
    m: '双峰山似M',
    n: '闪电似N',
    o: '圆环似O，嘴巴',
    p: '旗子似P',
    q: '蝌蚪似Q，带尾',
    r: '人腿似R',
    s: '蛇似S，天鹅',
    t: '伞柄似T',
    u: '杯子似U',
    v: '胜利手势似V',
    w: '波浪似W',
    x: '交叉似X，剪刀',
    y: '树杈似Y',
    z: '闪电似Z'
}

const PHONICS_RULES = {
    magicE: { pattern: 'a_e, i_e, o_e, u_e', desc: '魔法E：结尾的e让元音读字母本音', examples: ['cake', 'bike', 'home', 'cute'] },
    vowelDigraph: { pattern: 'ai, ee, oa, ou, ea', desc: '元音组合：两个元音一起发一个音', examples: ['rain', 'see', 'coat', 'shout', 'meat'] },
    rControlled: { pattern: 'ar, er, ir, or, ur', desc: 'R控制音：R改变前面元音的发音', examples: ['car', 'her', 'bird', 'for', 'burn'] },
    consonantBlend: { pattern: 'ch, sh, th, ph, wh', desc: '辅音组合：两个辅音一起发一个新音', examples: ['chair', 'ship', 'this', 'phone', 'what'] },
    doubleConsonant: { pattern: 'bb, dd, gg, ll, mm, nn, pp, rr, ss, tt', desc: '双辅音：两个相同辅音只发一个音', examples: ['book', 'happy', 'better'] }
}

const WORD_FAMILY_MAP = {
    work: ['worker', 'working', 'works', 'workplace'],
    beauty: ['beautiful', 'beautifully', 'beautify'],
    act: ['actor', 'action', 'active', 'activity'],
    happy: ['happiness', 'happily', 'unhappy'],
    know: ['knowledge', 'known', 'unknown'],
    help: ['helper', 'helpful', 'helpless'],
    like: ['likely', 'unlike', 'likeness'],
    love: ['lover', 'lovely', 'loving'],
    play: ['player', 'playing', 'playful'],
    run: ['runner', 'running', 'runway'],
    write: ['writer', 'writing', 'written'],
    read: ['reader', 'reading', 'readable'],
    speak: ['speaker', 'speaking', 'speech'],
    teach: ['teacher', 'teaching', 'teachable'],
    learn: ['learner', 'learning', 'learned'],
    sing: ['singer', 'singing', 'song'],
    dance: ['dancer', 'dancing', 'danceable'],
    jump: ['jumper', 'jumping', 'jumpy'],
    swim: ['swimmer', 'swimming', 'swimsuit'],
    eat: ['eater', 'eating', 'eatable'],
    drink: ['drinker', 'drinking', 'drinkable'],
    open: ['opening', 'opened', 'openly'],
    close: ['closer', 'closing', 'closure'],
    make: ['maker', 'making', 'makeup'],
    break: ['breaker', 'breaking', 'breakfast'],
    take: ['taker', 'taking', 'mistake'],
    give: ['giver', 'giving', 'forgive'],
    go: ['going', 'gogo', 'ongoing'],
    come: ['comer', 'coming', 'income'],
    see: ['seer', 'seeing', 'foresee'],
    look: ['looker', 'looking', 'outlook'],
    say: ['sayer', 'saying', 'unsay'],
    pay: ['payer', 'paying', 'repay'],
    buy: ['buyer', 'buying', 'rebuy'],
    sell: ['seller', 'selling', 'resell'],
    meet: ['meeter', 'meeting', 'unmeet'],
    leave: ['leaver', 'leaving', 'believe'],
    live: ['liver', 'living', 'alive'],
    die: ['dier', 'dying', 'undying'],
    try: ['trier', 'trying', 'retry'],
    fly: ['flyer', 'flying', 'flyable'],
    dry: ['dryer', 'drying', 'dryly'],
    cry: ['crier', 'crying', 'crystal'],
    // More word families
    important: ['importance', 'importantly', 'unimportant'],
    differ: ['different', 'difference', 'differently'],
    similar: ['similarity', 'similarly', 'dissimilar'],
    possible: ['possibility', 'possibly', 'impossible'],
    probable: ['probability', 'probably', 'improbable'],
    able: ['ability', 'abroad', 'disable'],
    nature: ['natural', 'naturally', 'naturalist'],
    culture: ['cultural', 'culturally', 'multicultural'],
    friend: ['friendly', 'friendship', 'friendless'],
    member: ['membership', 'memberless'],
    partner: ['partnership', 'partnerless'],
    leader: ['leadership', 'leaderless'],
    hard: ['hardship', 'hardware', 'hardly'],
    soft: ['softness', 'software', 'softly'],
    bright: ['brightness', 'brightly', 'brighten'],
    dark: ['darkness', 'darkly', 'darken'],
    light: ['lightness', 'lightly', 'lighten'],
    heavy: ['heaviness', 'heavily'],
    strong: ['strength', 'strongly', 'strengthen'],
    weak: ['weakness', 'weakly', 'weaken'],
    long: ['length', 'longly', 'lengthen'],
    short: ['shortness', 'shortly', 'shorten'],
    high: ['height', 'highly', 'highlight'],
    low: ['lowness', 'lowly', 'lower'],
    wide: ['width', 'widely', 'widen'],
    narrow: ['narrowness', 'narrowly', 'narrow'],
    deep: ['depth', 'deeply', 'deepen'],
    shallow: ['shallowness', 'shallowly'],
    fast: ['fastness', 'fastly', 'fasten'],
    slow: ['slowness', 'slowly', 'slowdown'],
    new: ['newness', 'newly', 'renew'],
    old: ['oldness', 'oldly', 'olden'],
    young: ['youngness', 'youngster'],
    big: ['bigness', 'bigger', 'biggest'],
    small: ['smallness', 'smaller', 'smallest'],
    good: ['goodness', 'goodbye', 'goodnight'],
    bad: ['badness', 'badly', 'badminton'],
    happy: ['happiness', 'happily', 'unhappy'],
    sad: ['sadness', 'sadly', 'sadden'],
    angry: ['anger', 'angrily', 'angry'],
    afraid: ['fear', 'fearful', 'fearlessly'],
    tired: ['tiredness', 'tiredly', 'retire'],
    hungry: ['hunger', 'hungrily'],
    thirsty: ['thirst', 'thirstily'],
    cold: ['coldness', 'coldly', 'colden'],
    hot: ['hotness', 'hotly'],
    warm: ['warmth', 'warmly', 'warmen'],
    cool: ['coolness', 'coolly', 'coolen'],
    beautiful: ['beauty', 'beautifully', 'beautify'],
    ugly: ['ugliness', 'uglily'],
    clean: ['cleanliness', 'cleanly', 'cleanse'],
    dirty: ['dirtiness', 'dirtily'],
    bright: ['brightness', 'brightly', 'brighten'],
    dark: ['darkness', 'darkly', 'darken'],
    soft: ['softness', 'softly', 'soften'],
    hard: ['hardness', 'hardly', 'harden'],
    sweet: ['sweetness', 'sweetly', 'sweeten'],
    bitter: ['bitterness', 'bitterly', 'embitter'],
    funny: ['funniness', 'funnily'],
    exciting: ['excitement', 'excitedly'],
    boring: ['boredom', 'boringly'],
    interesting: ['interest', 'interestingly'],
    easy: ['easiness', 'easily', 'ease'],
    difficult: ['difficulty', 'difficultly'],
    possible: ['possibility', 'possibly', 'impossible'],
    important: ['importance', 'importantly', 'unimportant'],
    necessary: ['necessity', 'necessarily', 'unnecessary'],
    different: ['difference', 'differently', 'differentiate'],
    same: ['sameness', 'samewise'],
    similar: ['similarity', 'similarly', 'dissimilar'],
    common: ['commonness', 'commonly', 'commonplace'],
    unique: ['uniqueness', 'uniquely'],
    rare: ['rarity', 'rarely'],
    precious: ['preciousness', 'preciously'],
    valuable: ['value', 'valuably', 'invaluable'],
    essential: ['essence', 'essentially'],
    vital: ['vitality', 'vitally'],
    crucial: ['cruciality', 'crucially'],
    critical: ['criticism', 'critically'],
    urgent: ['urgency', 'urgently'],
    immediate: ['immediacy', 'immediately'],
    important: ['importance', 'importantly']
}

const SIMILAR_WORDS = [
    { group: 'adapt/adopt', words: ['adapt', 'adopt'], diff: 'adapt中间a(adjust调整→适应)，adopt中间o(own拥有→收养)' },
    { group: 'quite/quiet', words: ['quite', 'quiet'], diff: 'quiet多了个e，e像一个人坐着很安静' },
    { group: 'through/though', words: ['through', 'though'], diff: 'through多一个r，r像路上的石头，穿过需要经过石头' },
    { group: 'plan/plane', words: ['plan', 'plane'], diff: 'plane比plan多一个e，e像翅膀，飞机有翅膀才能飞' },
    { group: 'price/prize', words: ['price', 'prize'], diff: 'price中间c(cost花费)，prize中间z(奖杯形状)' },
    { group: 'affect/effect', words: ['affect', 'effect'], diff: 'affect(a开头→影响动作)，effect(e开头→效果结果)' },
    { group: 'lie/lay', words: ['lie', 'lay'], diff: 'lie躺(不规则lay-lain)，lay放(规则laid)' },
    { group: 'among/between', words: ['among', 'between'], diff: 'among(三者以上之间)，between(两者之间)' },
    { group: 'beside/besides', words: ['beside', 'besides'], diff: 'beside旁边，besides除...之外还有' },
    { group: 'desert/dessert', words: ['desert', 'dessert'], diff: 'desert沙漠(一个s)，dessert甜点(两个s，像两层蛋糕)' },
    { group: 'later/latter', words: ['later', 'latter'], diff: 'later更晚，latter后者' },
    { group: 'historic/historical', words: ['historic', 'historical'], diff: 'historic有历史意义的，historical历史的' },
    { group: 'economic/economical', words: ['economic', 'economical'], diff: 'economic经济的，economical节约的' },
    { group: 'classic/classical', words: ['classic', 'classical'], diff: 'classic经典的，classical古典的' },
    { group: 'electric/electrical', words: ['electric', 'electrical'], diff: 'electric电的，electrical电气的' },
    { group: 'historic/historical', words: ['historic', 'historical'], diff: 'historic有历史意义的，historical历史的' }
]

const ALPHABET_FEATURES = {
    banana: '字母a重复3次，像香蕉的弯曲形状',
    see: '两个e代表两只眼睛，中间y像鼻梁 → 看见',
    book: '两个o像两只眼睛在看书',
    foot: '两个o像两个脚趾',
    teeth: '两个e像两排牙齿',
    balloon: '两个o像两个气球',
    coffee: '两个f像两个咖啡壶',
    address: '两个d像两扇门',
    tomorrow: '两个o像两个明天的太阳',
    letter: '两个e像两个信封',
    green: '两个e像两片绿叶',
    weekend: '两个e像两个周末的太阳',
    butterfly: '两个t像蝴蝶翅膀',
    school: '两个o像教室的两个窗户'
}

const SENTENCE_STORIES = {
    cat: 'The cat likes to fish for fish. 猫喜欢钓鱼。',
    dog: 'A dog runs in the park every day. 一只狗每天在公园跑。',
    book: 'I read a book before sleeping. 我睡前读书。',
    water: 'Fish live in water. 鱼生活在水里。',
    happy: 'She is happy to see her friend. 她见到朋友很开心。',
    sad: 'He felt sad when his cat died. 他的猫死了，他很伤心。',
    run: 'I run in the park every morning. 我每天早上在公园跑步。',
    eat: 'We eat breakfast at 7. 我们7点吃早餐。',
    sleep: 'Babies sleep a lot. 婴儿睡得很多。',
    love: 'I love my family. 我爱我的家人。',
    friend: 'A friend in need is a friend indeed. 患难见真情。',
    school: 'I go to school by bike. 我骑自行车上学。',
    work: 'My father works in a hospital. 我爸爸在医院工作。',
    play: 'Children play in the garden. 孩子们在花园里玩。',
    study: 'She studies hard for the exam. 她为考试努力学习。',
    music: 'I listen to music every day. 我每天听音乐。',
    dance: 'They dance at the party. 他们在派对上跳舞。',
    sing: 'She sings in the choir. 她在合唱团唱歌。',
    jump: 'The children jump for joy. 孩子们高兴得跳起来。',
    swim: 'Fish swim in the river. 鱼在河里游。',
    fly: 'Birds fly high in the sky. 鸟儿在天空高飞。',
    walk: 'We walk after dinner. 我们晚饭后散步。',
    talk: 'We talk about our dreams. 我们谈论梦想。',
    read: 'He reads newspapers every morning. 他每天早上读报纸。',
    write: 'She writes letters to her pen pal. 她给笔友写信。',
    teach: 'Mr. Wang teaches us English. 王老师教我们英语。',
    learn: 'We learn English at school. 我们在学校学英语。',
    help: 'I help my mother with housework. 我帮妈妈做家务。',
    like: 'I like apples very much. 我非常喜欢苹果。',
    want: 'I want to be a doctor. 我想成为一名医生。'
}

const EMOTION_ANCHORS = {
    fragile: '想象快递盒上写着 FRAGILE，结果里面装着一颗会爆炸的炸弹 → 你必须轻拿轻放',
    hungry: '想象一个人饿到啃自己的胳膊 → hungry 到饿疯了',
    lazy: '懒到张嘴吃饭都要别人喂 → lazy',
    giant: '想象一只蚂蚁举起重物 → 反差：蚂蚁举"巨"大重物',
    tiny: '想象一头大象钻进针眼 → 反差：大象"tiny"地穿过针眼',
    silent: '想象摇滚乐队全体静音 → 反差：最吵闹的乐队"silent"',
    huge: '想象一只蚂蚁扛着一栋楼 → 反差：蚂蚁扛"巨"大的楼',
    strong: '想象一根牙签顶住一座大厦 → 反差：牙签"strong"到顶大厦',
    bright: '想象太阳戴墨镜 → 反差：太阳太"bright"了',
    dark: '想象黑人牙膏美白牙齿 → 反差：用了反而"dark"',
    hot: '想象冰块在火炉里 → 反差：冰在火炉里"hot"',
    cold: '想象火焰在冰箱里 → 反差：火焰在冰箱里"cold"',
    fast: '想象蜗牛开赛车 → 反差：蜗牛开赛车特别"fast"',
    slow: '想象猎豹慢跑 → 反差：猎豹"slow"到可以打盹',
    easy: '想象微积分是小学题 → 反差：微积分"easy"到小学生都会',
    difficult: '想象1+1算不出来 → 反差：1+1太"difficult"了',
    beautiful: '想象一只猪戴皇冠 → 反差：猪变"beautiful"了',
    ugly: '想象王子变青蛙 → 反差：王子变"ugly"青蛙',
    happy: '想象哭着笑 → 反差：哭着却很"happy"',
    sad: '想象葬礼上大笑 → 反差：葬礼上却"sad"不起来'
}

const CREATIVE_SPLIT_RULES = {
    types: {
        word: '完整熟词',
        affix: '词缀组合',
        sound: '发音片段',
        pictogram: '象形字母',
        number: '数字谐音',
        pinyin: '拼音联想'
    }
}

const RHYME_PAIRS = [
    { words: ['bee', 'tree'], rhyme: 'I see a bee fly to the tree. 我看见一只蜜蜂飞向大树。' },
    { words: ['cat', 'hat'], rhyme: 'The cat wears a hat. 猫戴着一顶帽子。' },
    { words: ['dog', 'fog'], rhyme: 'A dog runs in the fog. 一只狗在雾中奔跑。' },
    { words: ['fox', 'box'], rhyme: 'A fox is in the box. 一只狐狸在盒子里。' },
    { words: ['pig', 'wig'], rhyme: 'The pig has a wig. 猪戴着一顶假发。' },
    { words: ['bird', 'word'], rhyme: 'A bird knows every word. 一只鸟认识每个单词。' },
    { words: ['book', 'cook'], rhyme: 'I read a book, you be a cook. 我读书，你当厨师。' },
    { words: ['fish', 'dish'], rhyme: 'The fish is on the dish. 鱼在盘子里。' },
    { words: ['moon', 'balloon'], rhyme: 'The moon is a big balloon. 月亮像一个大气球。' },
    { words: ['star', 'car'], rhyme: 'A star drives a car. 一颗星星开着车。' },
    { words: ['rain', 'train'], rhyme: 'The rain stops the train. 大雨让火车停了。' },
    { words: ['snow', 'glow'], rhyme: 'The snow starts to glow. 雪开始发光。' },
    { words: ['sun', 'bun'], rhyme: 'The sun eats a bun. 太阳吃了一个面包。' },
    { words: ['tree', 'bee'], rhyme: 'Under the tree, there is a bee. 树下有一只蜜蜂。' },
    { words: ['cat', 'bat'], rhyme: 'The cat sees a bat. 猫看见一只蝙蝠。' }
]

const FIRST_LETTER_GROUPS = [
    { letters: 'ROYGBIV', words: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet'], desc: '彩虹七色' },
    { letters: 'FAMILIES', words: ['Father', 'And', 'Mother', 'I', 'Love', 'IES'], desc: '家庭：爸妈我爱你们' },
    { letters: 'PANDA', words: ['People', 'And', 'Nature', 'Dream', 'Action'], desc: '熊猫：人与自然梦想行动' },
    { letters: 'TEACHER', words: ['Teach', 'Encourage', 'Advice', 'Create', 'Help', 'Educate', 'Respect'], desc: '老师：教导鼓励建议创造帮助教育尊重' },
    { letters: 'STUDENT', words: ['Study', 'Think', 'Understand', 'Do', 'Explore', 'Notice', 'Try'], desc: '学生：学习思考理解探索注意尝试' }
]

function classifyWord(word) {
    const lowerWord = word.toLowerCase()
    const len = lowerWord.length
    let lengthCat = 'short'
    if (len >= 7) lengthCat = 'long'
    else if (len >= 4) lengthCat = 'medium'

    let decomposable = 'none'
    if (len >= 5) {
        const hasPrefix = Object.keys(PREFIXES).some(p => lowerWord.startsWith(p) && lowerWord.length > p.length)
        const hasSuffix = Object.keys(SUFFIXES).some(s => lowerWord.endsWith(s) && lowerWord.length > s.length)
        const hasRoot = Object.keys(ROOTS).some(r => lowerWord.includes(r))
        if ((hasPrefix || hasSuffix) && hasRoot) decomposable = 'strong'
        else if (hasPrefix || hasSuffix || hasRoot) decomposable = 'medium'
        else {
            const hasCommonWord = [...COMMON_WORDS].some(cw => cw.length >= 3 && lowerWord.includes(cw))
            if (hasCommonWord) decomposable = 'weak'
        }
    }
    return { length: lengthCat, decomposable }
}

function analyzeRootAffix(word) {
    const lowerWord = word.toLowerCase()
    const len = lowerWord.length
    if (len <= 4) return null

    let prefix = ''
    let root = ''
    let suffix = ''

    for (const [key, meaning] of Object.entries(PREFIXES)) {
        if (lowerWord.startsWith(key) && lowerWord.length > key.length) {
            prefix = key
            break
        }
    }

    for (const [key, meaning] of Object.entries(SUFFIXES)) {
        if (lowerWord.endsWith(key) && lowerWord.length > key.length) {
            suffix = key
            break
        }
    }

    let remaining = lowerWord
    if (prefix) remaining = remaining.slice(prefix.length)
    if (suffix) remaining = remaining.slice(0, -suffix.length)

    for (const [key, meaning] of Object.entries(ROOTS)) {
        if (remaining.includes(key)) {
            root = key
            break
        }
    }

    if (!prefix && !root && !suffix) return null

    let description = `${word} = `
    const parts = []

    if (prefix) {
        parts.push(`${prefix}(${PREFIXES[prefix]})`)
    }
    if (root) {
        parts.push(`${root}(${ROOTS[root]})`)
    } else if (remaining) {
        parts.push(remaining)
    }
    if (suffix) {
        parts.push(`${suffix}(${SUFFIXES[suffix]})`)
    }

    description += parts.join('+') + ' → '

    if (root) {
        description += ROOTS[root]
    } else {
        description += '组合构成'
    }

    return {
        type: 'rootAffix',
        description,
        tip: null
    }
}

function analyzeCompoundWord(word) {
    const lowerWord = word.toLowerCase()
    const len = lowerWord.length
    if (len < 5) return null

    for (let i = 2; i < len - 1; i++) {
        const part1 = lowerWord.slice(0, i)
        const part2 = lowerWord.slice(i)
        if (COMMON_WORDS.has(part1) && COMMON_WORDS.has(part2)) {
            const description = `${word} = ${part1} + ${part2} → 由两个单词组合而成`
            return {
                type: 'compound',
                description,
                tip: null
            }
        }
    }
    return null
}

function analyzeInnerWord(word) {
    const lowerWord = word.toLowerCase()
    const len = lowerWord.length
    if (len < 5) return null

    const innerWords = []
    for (let start = 0; start < len - 2; start++) {
        for (let end = start + 3; end <= len; end++) {
            const sub = lowerWord.slice(start, end)
            if (sub !== lowerWord && COMMON_WORDS.has(sub)) {
                innerWords.push(sub)
            }
        }
    }

    if (innerWords.length === 0) return null

    const uniqueWords = [...new Set(innerWords)].slice(0, 3)
    let description = `${word} 内含 `
    description += uniqueWords.map(w => `${w}（${HOMOPHONIC_MAP[w]?.desc || '熟词'}）`).join('、')

    if (word === 'friend' && innerWords.includes('end')) {
        description += '。联想：真正的朋友不会走到终点。'
    } else if (word === 'season' && innerWords.includes('sea')) {
        description += '。联想：海边的季节很美。'
    } else {
        description += '，利用已知熟词搭建记忆桥梁。'
    }

    return {
        type: 'innerWord',
        description,
        tip: null
    }
}

function analyzeHomophonic(word) {
    const lowerWord = word.toLowerCase()
    const entry = HOMOPHONIC_MAP[lowerWord]
    if (!entry) return null

    const description = `${word} 谐音「${entry.text}」→ ${entry.desc}`
    return {
        type: 'homophonic',
        description,
        tip: '谐音仅用来辅助记拼写，不要使用中文谐音朗读单词'
    }
}

function analyzeScene(word) {
    const lowerWord = word.toLowerCase()
    const scene = WORD_SCENES[lowerWord]
    if (!scene) return null

    const description = `${word}：${scene}`
    return {
        type: 'scene',
        description,
        tip: null
    }
}

function analyzeSynonym(word) {
    const lowerWord = word.toLowerCase()
    const synonyms = SYNONYM_MAP[lowerWord]
    if (!synonyms || synonyms.length === 0) return null

    const topSynonyms = synonyms.slice(0, 3)
    const description = `${word} 的近义词：${topSynonyms.join('、')}`
    return {
        type: 'synonym',
        description,
        tip: null
    }
}

function analyzeAntonym(word) {
    const lowerWord = word.toLowerCase()
    const antonym = ANTONYM_MAP[lowerWord]
    if (!antonym) return null

    const description = `${word} ↔ ${antonym}（反义词）`
    return {
        type: 'antonym',
        description,
        tip: null
    }
}

function analyzeEtymology(word) {
    const lowerWord = word.toLowerCase()
    const entry = ETYMOLOGY_MAP[lowerWord]
    if (!entry) return null
    return { type: 'etymology', description: entry.text, tip: entry.tip }
}

function analyzeCreativeSplit(word) {
    const lowerWord = word.toLowerCase()
    const len = lowerWord.length
    if (len < 5) return null

    const segments = []
    for (const [key, meaning] of Object.entries(PREFIXES)) {
        if (lowerWord.startsWith(key) && lowerWord.length > key.length) {
            segments.push({ text: key, type: 'affix', meaning })
            break
        }
    }
    const remaining1 = segments.length ? lowerWord.slice(segments[0].text.length) : lowerWord
    for (const [key, meaning] of Object.entries(SUFFIXES)) {
        if (remaining1.endsWith(key) && remaining1.length > key.length) {
            segments.push({ text: key, type: 'affix', meaning })
            break
        }
    }
    let midPart = remaining1
    if (segments.length >= 2) midPart = remaining1.slice(0, -segments[segments.length - 1].text.length)
    else if (segments.length === 1 && segments[0].type === 'affix') {
        if (lowerWord.startsWith(segments[0].text)) midPart = lowerWord.slice(segments[0].text.length)
        else midPart = lowerWord.slice(0, -segments[0].text.length)
    }

    for (const [key, meaning] of Object.entries(ROOTS)) {
        if (midPart.includes(key)) {
            segments.push({ text: key, type: 'word', meaning })
            break
        }
    }

    let creativeSegs = [...segments]
    if (creativeSegs.length < 2) {
        const found = []
        for (let i = 2; i < len - 1; i++) {
            const p1 = lowerWord.slice(0, i)
            const p2 = lowerWord.slice(i)
            if (COMMON_WORDS.has(p1) && p2.length >= 2) {
                found.push({ text: p1, type: 'word', meaning: '熟词' })
                found.push({ text: p2, type: 'sound', meaning: '发音联想' })
                break
            }
        }
        creativeSegs = found
    }

    if (creativeSegs.length === 0) {
        return null
    }

    const desc = creativeSegs.map(s => `${s.text}(${s.meaning})`).join(' + ')
    return {
        type: 'creativeSplit',
        description: `${word} = ${desc} → 创意拆分记忆`,
        tip: '⚠️ 创意拆分，非官方词根'
    }
}

function analyzeWordFamily(word) {
    const lowerWord = word.toLowerCase()
    const family = WORD_FAMILY_MAP[lowerWord]
    if (!family || family.length === 0) return null

    const derivs = family.slice(0, 4)
    const parts = []
    for (const d of derivs) {
        const suffix = d.replace(lowerWord, '')
        if (suffix.startsWith('er')) parts.push(`${d}(-er 人)`)
        else if (suffix.startsWith('ing')) parts.push(`${d}(-ing 进行时)`)
        else if (suffix.startsWith('ly')) parts.push(`${d}(-ly 副词)`)
        else if (suffix.startsWith('ness')) parts.push(`${d}(-ness 名词)`)
        else if (suffix.startsWith('ful')) parts.push(`${d}(-ful 充满)`)
        else if (suffix.startsWith('less')) parts.push(`${d}(-less 没有)`)
        else if (suffix.startsWith('tion')) parts.push(`${d}(-tion 名词)`)
        else if (suffix.startsWith('ment')) parts.push(`${d}(-ment 名词)`)
        else parts.push(d)
    }

    return {
        type: 'wordFamily',
        description: `${word} 词族：${parts.join('、')}，记住一个，一串都会！`,
        tip: null
    }
}

function analyzeSimilarWord(word) {
    const lowerWord = word.toLowerCase()
    for (const group of SIMILAR_WORDS) {
        if (group.words.includes(lowerWord)) {
            return {
                type: 'similarWord',
                description: `${group.group}：${group.diff}`,
                tip: null
            }
        }
    }
    return null
}

function analyzeTPR(word) {
    const lowerWord = word.toLowerCase()
    const action = TPR_ACTIONS[lowerWord]
    if (!action) return null
    return {
        type: 'tpr',
        description: `${word}：${action}。快跟我做一次！`,
        tip: '用身体动作建立肌肉记忆'
    }
}

function analyzeLetterPictogram(word) {
    const lowerWord = word.toLowerCase()
    const firstLetter = lowerWord[0]
    if (!firstLetter) return null
    const picto = LETTER_PICTOGRAM[firstLetter]
    if (!picto) return null

    const letters = [...new Set(lowerWord.split(''))].slice(0, 3)
    const parts = letters.map(l => LETTER_PICTOGRAM[l] || l).filter(Boolean)

    return {
        type: 'letterPictogram',
        description: `${word}：${parts.join('，')}`,
        tip: '字母象形记忆，适合低龄用户'
    }
}

function analyzePhonics(word) {
    const lowerWord = word.toLowerCase()
    const len = lowerWord.length
    if (len < 3 || len > 10) return null

    for (const [key, rule] of Object.entries(PHONICS_RULES)) {
        if (rule.examples.includes(lowerWord)) {
            return {
                type: 'phonics',
                description: `${word} 符合「${rule.desc}」规则 → 更容易记住拼写`,
                tip: null
            }
        }
    }

    if (lowerWord.match(/[a-z]+e$/)) {
        const vowel = lowerWord[0]
        if ('aio'.includes(vowel) && lowerWord.length > 3) {
            return {
                type: 'phonics',
                description: `${word} 符合「魔法E」规则：结尾的e让${vowel}读字母本音 /${vowel}/`,
                tip: null
            }
        }
    }
    return null
}

function analyzeEmotionAnchor(word) {
    const lowerWord = word.toLowerCase()
    const anchor = EMOTION_ANCHORS[lowerWord]
    if (!anchor) return null
    return {
        type: 'emotionAnchor',
        description: anchor,
        tip: '情绪锚定：越反差越难忘'
    }
}

function analyzeAlphabetFeature(word) {
    const lowerWord = word.toLowerCase()
    const feature = ALPHABET_FEATURES[lowerWord]
    if (!feature) return null

    const counts = {}
    for (const ch of lowerWord) counts[ch] = (counts[ch] || 0) + 1
    const repeated = Object.entries(counts).filter(([_, c]) => c >= 2)
    const repeatDesc = repeated.length > 0
        ? `字母「${repeated.map(([ch]) => ch).join('、')}」重复出现`
        : ''

    return {
        type: 'alphabetFeature',
        description: `${word}：${feature}${repeatDesc ? '。' + repeatDesc : ''}`,
        tip: null
    }
}

function analyzeSentenceStory(word) {
    const lowerWord = word.toLowerCase()
    const story = SENTENCE_STORIES[lowerWord]
    if (!story) return null
    return {
        type: 'sentenceStory',
        description: story,
        tip: null
    }
}

function analyzeRhyme(word) {
    const lowerWord = word.toLowerCase()
    for (const pair of RHYME_PAIRS) {
        if (pair.words.includes(lowerWord)) {
            return {
                type: 'rhyme',
                description: pair.rhyme,
                tip: '押韵顺口溜，朗朗上口'
            }
        }
    }
    return null
}

function analyzeFirstLetter(word) {
    const lowerWord = word.toLowerCase()
    const letter = lowerWord[0]
    if (!letter) return null
    for (const group of FIRST_LETTER_GROUPS) {
        if (group.words.map(w => w.toLowerCase()).includes(lowerWord)) {
            return {
                type: 'firstLetter',
                description: `${group.desc}：${group.letters} = ${group.words.join('、')}`,
                tip: '首字母组合记忆'
            }
        }
    }
    return null
}

function scoreQuality(method, wordClass) {
    let score = 3
    const desc = method.description || ''

    if (desc.length >= 40 && desc.length <= 80) score += 1
    if (desc.length > 80) score += 0.5
    if (desc.length < 20) score -= 1

    const logicTypes = ['rootAffix', 'compound', 'etymology', 'creativeSplit', 'wordFamily', 'similarWord', 'phonics']
    const imageTypes = ['homophonic', 'scene', 'tpr', 'letterPictogram', 'emotionAnchor', 'rhyme']

    if (logicTypes.includes(method.type)) score += 1
    if (imageTypes.includes(method.type)) score += 0.5
    if (wordClass.length === 'long' && logicTypes.includes(method.type)) score += 0.5
    if (wordClass.length === 'short' && imageTypes.includes(method.type)) score += 0.5
    if (method.tip) score += 0.5

    return Math.min(5, Math.max(1, score))
}

const memoryMethods = computed(() => {
    const word = String(props.word || '').trim()
    const meaning = String(props.meaning || '').trim()
    if (!word) return []

    const wordClass = classifyWord(word)
    const allCandidates = []

    const analyzers = [
        analyzeRootAffix,
        analyzeCompoundWord,
        analyzeEtymology,
        analyzeCreativeSplit,
        analyzeWordFamily,
        analyzeInnerWord,
        analyzeSimilarWord,
        analyzePhonics,
        analyzeHomophonic,
        analyzeLetterPictogram,
        analyzeTPR,
        analyzeScene,
        analyzeEmotionAnchor,
        analyzeAlphabetFeature,
        analyzeSynonym,
        analyzeAntonym,
        analyzeSentenceStory,
        analyzeRhyme,
        analyzeFirstLetter
    ]

    for (const analyzer of analyzers) {
        const result = analyzer(word)
        if (result) {
            const qs = scoreQuality(result, wordClass)
            allCandidates.push({ ...result, quality: qs })
        }
    }

    const filtered = allCandidates.filter(m => m.quality >= 2)
    filtered.sort((a, b) => b.quality - a.quality)

    const seenTypes = new Set()
    const unique = filtered.filter(m => {
        if (seenTypes.has(m.type)) return false
        seenTypes.add(m.type)
        return true
    })

    const hasLogic = unique.some(m => ['rootAffix', 'compound', 'etymology', 'creativeSplit', 'wordFamily', 'similarWord', 'phonics'].includes(m.type))
    const hasImage = unique.some(m => ['homophonic', 'scene', 'tpr', 'letterPictogram', 'emotionAnchor', 'rhyme', 'sentenceStory'].includes(m.type))

    if (!hasLogic && !hasImage && unique.length > 0) {
        const sentence = analyzeSentenceStory(word)
        if (sentence) unique.push({ ...sentence, quality: 3 })
    }

    return unique.slice(0, 3)
})

function getMethodIcon(type) {
    const icons = {
        rootAffix: '📚',
        compound: '🧩',
        innerWord: '🔍',
        homophonic: '🎵',
        scene: '🎬',
        synonym: '🔗',
        antonym: '⚖️',
        etymology: '📖',
        creativeSplit: '✂️',
        wordFamily: '🌳',
        similarWord: '🔀',
        tpr: '🏃',
        letterPictogram: '🔤',
        phonics: '📐',
        emotionAnchor: '🎭',
        alphabetFeature: '🔠',
        sentenceStory: '📝',
        rhyme: '🎤',
        firstLetter: '🔡'
    }
    return icons[type] || '💡'
}

function getMethodName(type) {
    const names = {
        rootAffix: '词根词缀记忆',
        compound: '复合词拆分记忆',
        innerWord: '词中词寻宝记忆',
        homophonic: '谐音联想记忆',
        scene: '图像场景联想',
        synonym: '近义词关联记忆',
        antonym: '反义词对比记忆',
        etymology: '词源故事记忆',
        creativeSplit: '创意拆分记忆',
        wordFamily: '词族联动记忆',
        similarWord: '形近词对比记忆',
        tpr: 'TPR动作记忆',
        letterPictogram: '字母象形记忆',
        phonics: '拼读规则记忆',
        emotionAnchor: '情绪锚定记忆',
        alphabetFeature: '字母特征记忆',
        sentenceStory: '短句故事记忆',
        rhyme: '顺口溜记忆',
        firstLetter: '首字母缩写记忆'
    }
    return names[type] || '创意记忆'
}

function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return ''
    try {
        const u = new URL(url)
        return u.href
    } catch {
        try {
            return encodeURI(url).replace(/%25/g, '%')
        } catch {
            return url
        }
    }
}

async function searchImages() {
    const word = String(props.word || '').trim()
    if (!word) {
        imageUrls.value = []
        imageThumbnails.value = []
        imageLoaded.value = {}
        return
    }

    loadingImages.value = true
    try {
        const meaning = String(props.meaning || '').trim()
        const meaningFirst = meaning ? `${meaning} ${word}` : word
        const keyword = `${meaningFirst} 英文单词`
        const response = await fetch(`/api/image/search?keyword=${encodeURIComponent(keyword)}&count=5`)
        const data = await response.json()
        if (data?.code === 1 && data?.data?.images) {
            const urls = data.data.images
                .map(img => sanitizeUrl(img.thumbnail || img.url))
                .filter(u => u)
            imageUrls.value = urls
            imageThumbnails.value = urls
            imageLoaded.value = {}
        } else {
            imageUrls.value = []
            imageThumbnails.value = []
            imageLoaded.value = {}
        }
    } catch {
        imageUrls.value = []
        imageThumbnails.value = []
        imageLoaded.value = {}
    } finally {
        loadingImages.value = false
    }
}

watch(() => props.word, () => {
    searchImages()
}, { immediate: true })
</script>

<style scoped>
.word-memory {
    padding: 16px;
    display: flex;
    flex-direction: column;
    height: 100%;
    box-sizing: border-box;
}

.memory-header {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
}

.memory-title {
    font-size: 18px;
    font-weight: 700;
    color: #101919;
}

.memory-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    flex: 1;
    min-height: 0;
}

.memory-content-single {
    grid-template-columns: 1fr;
}

.view-memory,
.view-images {
    padding: 0;
}

.view-images .memory-carousel-image {
    height: 100%;
}

.memory-left {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.memory-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.memory-card {
    padding: 16px;
    border-radius: 8px;
    background: #f8fdfb;
    border: 1px solid #e0f2f1;
    transition: all 0.2s;
}

.memory-card:hover {
    background: #e8f5f3;
    border-color: #b2dfdb;
}

.memory-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.memory-card-icon {
    font-size: 20px;
}

.memory-card-title {
    font-size: 14px;
    font-weight: 600;
    color: #126b62;
}

.memory-card-quality {
    margin-left: auto;
    font-size: 12px;
    padding: 1px 6px;
    border-radius: 10px;
    font-weight: 600;
}

.memory-card-quality.q-5 {
    background: #ff6b35;
    color: #fff;
}

.memory-card-quality.q-4 {
    background: #ffa726;
    color: #fff;
}

.memory-card-quality.q-3 {
    background: #ffd54f;
    color: #5d4037;
}

.memory-card-quality.q-2 {
    background: #e0e0e0;
    color: #757575;
}

.memory-card-quality.q-1 {
    background: #ef5350;
    color: #fff;
}

.memory-card-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.memory-card-desc {
    margin: 0;
    font-size: 15px;
    color: #40504c;
    line-height: 1.6;
}

.memory-card-tip {
    margin: 0;
    font-size: 13px;
    color: #8c9996;
    background: #fff8e1;
    padding: 6px 10px;
    border-radius: 4px;
    border-left: 3px solid #ffb300;
}

.memory-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px;
    color: #8c9996;
}

.memory-empty-icon {
    font-size: 24px;
}

.memory-empty-text {
    font-size: 14px;
}

.memory-right {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    min-height: 0;
}

.memory-image-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.memory-image-title {
    font-size: 14px;
    font-weight: 600;
    color: #126b62;
}

.memory-carousel {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e0f2f1;
    background: #f8fdfb;
    flex: 1;
    min-height: 280px;
}

.memory-carousel-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    cursor: zoom-in;
    transition: opacity 0.4s;
    opacity: 0;
    display: block;
    margin: 0 auto;
}

.memory-carousel-image.is-loaded {
    opacity: 1;
}

.memory-carousel :deep(.el-carousel__indicators) {
    background: rgba(255, 255, 255, 0.92);
    border-radius: 14px;
    border: 2px solid #03564f25;
    padding: 5px 12px;
    display: inline-flex;
    gap: 6px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    width: auto !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    bottom: 10px !important;
    height: auto !important;
    line-height: 0 !important;
}

.memory-carousel :deep(.el-carousel__indicator) {
    padding: 0 !important;
    width: auto !important;
    height: auto !important;
}

.memory-carousel :deep(.el-carousel__button) {
    background-color: #222 !important;
    opacity: 0.55;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: none;
    box-shadow: none;
    transition: all 0.2s;
}

.memory-carousel :deep(.el-carousel__indicator.is-active .el-carousel__button) {
    background-color: #e53935 !important;
    opacity: 1;
    transform: scale(1.3);
    box-shadow: 0 0 0 2px rgba(229, 57, 53, 0.3);
}

.memory-carousel :deep(.el-carousel__arrow) {
    background-color: rgba(18, 107, 98, 0.7);
    color: #fff;
    font-size: 18px;
    width: 36px;
    height: 36px;
}

.memory-carousel :deep(.el-carousel__arrow:hover) {
    background-color: rgba(18, 107, 98, 0.95);
}

.memory-carousel :deep(.el-carousel__arrow--left) {
    left: 8px;
}

.memory-carousel :deep(.el-carousel__arrow--right) {
    right: 8px;
}

.memory-image-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    background: #f0f7f5;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.memory-image-skeleton {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: linear-gradient(90deg, #f0f7f5 0%, #e0f2f1 50%, #f0f7f5 100%);
    background-size: 200% 100%;
    animation: skeleton-wave 1.4s ease-in-out infinite;
}

@keyframes skeleton-wave {
    0% {
        background-position: 200% 0;
    }

    100% {
        background-position: -200% 0;
    }
}

.memory-image-skeleton-icon {
    font-size: 32px;
    opacity: 0.5;
}

.memory-image-skeleton-text {
    font-size: 13px;
    color: #8c9996;
}

.memory-image-count {
    margin-left: auto;
    font-size: 12px;
    color: #126b62;
    background: #e0f2f1;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 600;
}

.memory-image-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px;
    color: #8c9996;
    background: #f8fdfb;
    border-radius: 8px;
    border: 1px solid #e0f2f1;
    flex: 1;
    min-height: 0;
}

.memory-image-empty-icon {
    font-size: 32px;
}

.memory-image-empty-text {
    font-size: 14px;
}

.memory-image-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px;
    color: #8c9996;
    background: #f8fdfb;
    border-radius: 8px;
    border: 1px solid #e0f2f1;
    flex: 1;
    min-height: 0;
}

.memory-image-loading-icon {
    font-size: 24px;
    animation: spin 1s linear infinite;
}

.memory-image-loading-text {
    font-size: 14px;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 768px) {
    .memory-content {
        grid-template-columns: 1fr;
    }
}

:deep(.memory-carousel .el-carousel__indicators--bottom) {
    bottom: 8px;
}

:deep(.memory-carousel .el-carousel__indicator button) {
    background-color: rgba(255, 255, 255, 0.6);
    width: 8px;
    height: 8px;
}

:deep(.memory-carousel .el-carousel__indicator--active button) {
    background-color: #fff;
}

.image-preview-dialog :deep(.el-dialog) {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.image-preview-dialog :deep(.el-dialog__body) {
    padding: 10px 20px 30px;
    background: #1a1a2e;
    display: flex;
    align-items: center;
    justify-content: center;
}

.image-preview-dialog :deep(.el-carousel) {
    width: 100%;
    height: 70vh;
}

.image-preview-dialog :deep(.el-carousel__item) {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 70vh;
}

.preview-image-wrapper {
    position: relative;
    width: 100%;
    height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1a1a2e;
}

.preview-image {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
    display: block;
    margin: 0 auto;
    opacity: 0;
    transition: opacity 0.4s;
}

.preview-image.is-loaded {
    opacity: 1;
}

.preview-image-loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: #1a1a2e;
    color: #aaa;
}

.image-preview-dialog :deep(.el-dialog__header) {
    background: #1a1a2e;
    margin-right: 0;
}

.image-preview-dialog :deep(.el-dialog__title) {
    color: #fff;
}

.image-preview-dialog :deep(.el-dialog__close) {
    color: #fff;
}

.image-preview-dialog :deep(.el-carousel__button) {
    background-color: rgba(255, 255, 255, 0.2);
}

.image-preview-dialog :deep(.el-carousel__indicators--outside) {
    margin-top: 12px;
}

.image-preview-dialog :deep(.el-carousel__indicators--outside .el-carousel__indicator button) {
    background-color: rgba(255, 255, 255, 0.4);
    width: 10px;
    height: 10px;
}

.image-preview-dialog :deep(.el-carousel__indicators--outside .el-carousel__indicator--active button) {
    background-color: #fff;
}
</style>
