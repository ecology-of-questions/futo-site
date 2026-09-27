# 0206 — 「観察する、学ぶ、試す」と「この場所について」の行を揃える

## Decision
Decision Log 0205で「この場所について」を人物イラストの行(観察する/学ぶ/試すのキャプション含む)のすぐ右に配置したが、プロジェクトオーナーから「『観察する、学ぶ、試す』のラインと、『この場所について』のラインを揃えて」という指摘を受けた。0205時点では`.heroSceneWithAside`が`align-items: center`だったため、「この場所について」は人物イラスト+キャプションを含めた行全体の縦方向の中心に位置しており、キャプション行(観察する/学ぶ/試す)よりも上にずれていた(実測でキャプション下端351.8px、リンク下端292px)。

`src/pages/index.module.css`を以下のとおり変更した。
- `.heroSceneWithAside`の`align-items`を`center`から`flex-end`に変更し、人物イラストの行と「この場所について」の下端を揃えるようにした。
- `.introAside`が持っていた`line-height: var(--home-leading)`(1.9)と`padding-bottom: var(--space-1)`を削除した。この2つが残っていると、`align-items: flex-end`で箱の下端を揃えても、行間の余白(line-height)とpadding分だけ実際の文字がキャプションの文字より上にずれてしまうため。削除後は`.heroCaption`と同じく本文既定の行間(`--lh-body`: 1.6)を継承する。

## 採用理由 (Rationale)
- `align-items: flex-end`にしたのは、人物イラストの行の一番下にあるのがキャプション(観察する/学ぶ/試す)であり、そこと文字の並びを揃えたいという指摘に対して、flexの下端揃えが最も直接的な対応だったため。
- `.introAside`の`line-height`・`padding-bottom`を削除したのは、これらが元々「この場所について」が見出しの右や人物イラストの行の下に単独で置かれていた頃の名残であり、現在は人物イラストの行とflexの兄弟になっているため、箱の内側に余分な余白があると`flex-end`揃えの意味が失われるため。実測でこの2つを削除したことで、キャプションの文字の下端とリンクの文字の下端が完全に一致した(ともに351.8px)。

## 他の案 (Alternatives)
- `align-items: baseline`を使う案も検討したが、人物イラストの行(`.heroFigureCell`がflex-directionをcolumnにした入れ子構造)の「ベースライン」がブラウザによってどの要素から算出されるか曖昧になりやすく、狙った位置に揃わないリスクがあったため、明確に検証できる`flex-end`+余分な余白の削除という方法を採った。
- `.introAside`にmargin-topを直接指定して微調整する案も検討したが、値がマジックナンバーになり、フォントサイズや行間が変わるたびに再調整が必要になるため、余白の発生源(line-height・padding)そのものを削除する方法を優先した。

## 将来の変更可能性 (Future changes)
- 今後キャプション(`.heroCaption`)側のフォントサイズや行間を変更する場合、`.introAside`側は特別な調整をしなくても`flex-end`揃えにより自動的に追従する。

## Research Context
「観察する/学ぶ/試す」という行為の並びと、「この場所について」という入り口を同じ高さの1本の線に揃えたことで、両者が同じ重みでこの場所を説明する要素であるという印象をより明確にした。

## 検証・未検証事項
- `npx astro check` / `npm run build`: エラーなし。
- Playwright(Chromium)で900px・1440px幅にて、`.heroCaption`と`.introAside`内リンクの`getBoundingClientRect().bottom`が完全に一致すること(ともに351.8px、1440px幅の場合)を確認。
- 390px・430px幅(折り返しあり/横並びのそれぞれ)で、スクリーンショット上も違和感のない揃い方になっていることを確認。
- 本entryはmain へ直接反映した変更のため、Cloudflare Production(`futoing.com`)への反映確認はデプロイ後にユーザー報告で行う。
