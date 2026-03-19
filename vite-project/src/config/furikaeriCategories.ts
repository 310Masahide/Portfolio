export interface CategoryConfigItem {
  label: string
  emoji: string
  color: string
  bg: string
  placeholder: string
}

// 旧 UI（良かったこと/悪かったこと/気づき）向け設定。
// 現在の UI は「今日は何がありましたか？」に統合したため未使用だが、
// 将来的にカテゴリ入力へ戻す可能性を考えて残してある。
export const categoryConfig: Record<string, CategoryConfigItem> = {
  good: {
    label: '良かったこと',
    emoji: '✦',
    color: '#6B9E78',
    bg: '#F0F7F2',
    placeholder: '今日うれしかったこと、うまくいったことは？',
  },
  bad: {
    label: '悪かったこと',
    emoji: '✧',
    color: '#B07070',
    bg: '#FBF3F3',
    placeholder: 'つらかったこと、うまくいかなかったことは？',
  },
  insight: {
    label: '気づき',
    emoji: '◈',
    color: '#7B8FA8',
    bg: '#F2F5F9',
    placeholder: '今日気づいたこと、学んだことは？',
  },
}
