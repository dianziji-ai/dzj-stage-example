/** 点选项直接发：第一次点时确认一次，勾了「以后不再提示」就记在本机（「看过了」类偏好）不再问 */
const KEY = 'gal-choice-direct'

export function choiceConfirmed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function rememberChoiceConfirmed() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* 存不了就下次再问一次 */
  }
}
