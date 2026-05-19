# 好运对对碰原型

这是一个可直接运行的静态 Web 原型。

## 体验方式

直接打开 `index.html` 即可体验游戏。

如果要用本地服务运行：

```bash
python -m http.server 4173
```

然后访问：

```text
http://localhost:4173/index.html
```

## 文件说明

- `index.html`：正式游戏原型入口
- `styles.css`：正式原型样式
- `app.js`：游戏规则与交互逻辑
- `assets/`：可替换 UI 美术资源
- `ui-styleguide.html`：设计语言与组件规范页
- `ui-styleguide.css`：UI Kit 样式

## 当前已实现

- 开局消耗入场券
- 选择幸运色
- 自动开盲袋与九宫格落位
- 幸运色、对碰、三连、全家福、清台规则
- 单局成就进度
- 补充包救命
- 补充包不足时引导购买礼包，购买后返回救命选择
- 最终结算
- 外部累计成就
- 限购礼包弹窗
