
import { PoemPair } from './types';

export const POEM_DATABASE: PoemPair[] = [
  { id: '1', upper: '床前明月光', lower: '疑是地上霜', author: '李白', title: '静夜思' },
  { id: '2', upper: '举头望明月', lower: '低头思故乡', author: '李白', title: '静夜思' },
  { id: '3', upper: '国破山河在', lower: '城春草木深', author: '杜甫', title: '春望' },
  { id: '4', upper: '感时花溅泪', lower: '恨别鸟惊心', author: '杜甫', title: '春望' },
  { id: '5', upper: '大漠孤烟直', lower: '长河落日圆', author: '王维', title: '使至塞上' },
  { id: '6', upper: '海上生明月', lower: '天涯共此时', author: '张九龄', title: '望月怀远' },
  { id: '7', upper: '采菊东篱下', lower: '悠然见南山', author: '陶渊明', title: '饮酒' },
  { id: '8', upper: '众里寻他千百度', lower: '蓦然回首', author: '辛弃疾', title: '青玉案' },
  { id: '9', upper: '无可奈何花落去', lower: '似曾相识燕归来', author: '晏殊', title: '浣溪沙' },
  { id: '10', upper: '曾经沧海难为水', lower: '除却巫山不是云', author: '元稹', title: '离思' },
  { id: '11', upper: '春种一粒粟', lower: '秋收万颗子', author: '李绅', title: '悯农' },
  { id: '12', upper: '四海无闲田', lower: '农夫犹饿死', author: '李绅', title: '悯农' },
  { id: '13', upper: '但愿人长久', lower: '千里共婵娟', author: '苏轼', title: '水调歌头' },
  { id: '14', upper: '问君能有几多愁', lower: '恰似一江春水向东流', author: '李煜', title: '虞美人' },
  { id: '15', upper: '不识庐山真面目', lower: '只缘身在此山中', author: '苏轼', title: '题西林壁' },
  { id: '16', upper: '谁言寸草心', lower: '报得三春晖', author: '孟郊', title: '游子吟' },
  { id: '17', upper: '会当凌绝顶', lower: '一览众山小', author: '杜甫', title: '望岳' },
  { id: '18', upper: '白日依山尽', lower: '黄河入海流', author: '王之涣', title: '登鹳雀楼' },
  { id: '19', upper: '欲穷千里目', lower: '更上一层楼', author: '王之涣', title: '登鹳雀楼' },
  { id: '20', upper: '两岸猿声啼不住', lower: '轻舟已过万重山', author: '李白', title: '早发白帝城' },
  { id: '21', upper: '青山遮不住', lower: '毕竟东流去', author: '辛弃疾', title: '菩萨蛮' },
  { id: '22', upper: '人面不知何处去', lower: '桃花依旧笑春风', author: '崔护', title: '题都城南庄' },
  { id: '23', upper: '身无彩凤双飞翼', lower: '心有灵犀一点通', author: '李商隐', title: '无题' },
  { id: '24', upper: '同是天涯沦落人', lower: '相逢何必曾相识', author: '白居易', title: '琵琶行' },
  { id: '25', upper: '小荷才露尖尖角', lower: '早有蜻蜓立上头', author: '杨万里', title: '小池' },
  { id: '26', upper: '接天莲叶无穷碧', lower: '映日荷花别样红', author: '杨万里', title: '晓出净慈寺' },
  { id: '27', upper: '山重水复疑无路', lower: '柳暗花明又一村', author: '陆游', title: '游山西村' },
  { id: '28', upper: '黑云压城城欲摧', lower: '甲光向日金鳞开', author: '李贺', title: '雁门太守行' },
  { id: '29', upper: '野火烧不尽', lower: '春风吹又生', author: '白居易', title: '赋得古原草' },
  { id: '30', upper: '不知细叶谁裁出', lower: '二月春风似剪刀', author: '贺知章', title: '咏柳' },
  { id: '31', upper: '落红不是无情物', lower: '化作春泥更护花', author: '龚自珍', title: '己亥杂诗' },
  { id: '32', upper: '洛阳亲友如相问', lower: '一片冰心在玉壶', author: '王昌龄', title: '芙蓉楼送辛渐' },
  { id: '33', upper: '劝君更尽一杯酒', lower: '西出阳关无故人', author: '王维', title: '送元二使安西' },
  { id: '34', upper: '飞流直下三千尺', lower: '疑是银河落九天', author: '李白', title: '望庐山瀑布' },
  { id: '35', upper: '露从今夜白', lower: '月是故乡明', author: '杜甫', title: '月夜忆舍弟' }
];

export const INITIAL_TIME = 60;
export const WRONG_PENALTY = 5;
export const MATCH_POINTS = 100;
