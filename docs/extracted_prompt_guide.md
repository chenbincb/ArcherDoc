第一階段：Gemini 擔任架構師（文字與邏輯）

在這個階段，完全不要碰圖像工具，專注於內容。

步驟 1：定義主題與大綱 向 Gemini 下達指令：

Prompt (給 Gemini):

我要做一份關於「2025年職場趨勢：人機協作的未來」的簡報。受眾是企業中高層管理者。請幫我規劃一個
8 頁的簡報大綱，包含標題頁和結尾頁。要求邏輯清晰，引人入勝。

步驟 2：生成每一頁的詳細內容 確認大綱後，請 Gemini 逐頁產生內容。

Prompt (給 Gemini):

現在請針對上面的8頁簡報大綱撰寫詳細內容。我需要一個醒目的標題，三個簡短有力的要點（Bullet
points），以及一句總結性的金句

第二階段：定義「視覺靈魂」（最關鍵的一步）

這是成敗的關鍵。我們需要找到一組「風格咒語（Style
Keywords）」，這組咒語將會貫穿每一張圖片的生成。

步驟 3：請 Gemini 協助定義視覺風格

Prompt (給 Gemini): (選擇canvas，主要是避免他聽不懂直接產圖)

我要做的簡報的主題是「未來的科技職場」，我希望風格是「既有高科技感，又帶有人文溫度的極簡主義」。請套用下面的框架幫我生成全新的32組用於AI繪圖的風格的提示詞prompt，記著，我只要提示詞，不是要生成圖片。

32種核心呈現框架：

1\. 「情境對比型」手法 (Problem vs. Solution)

這種手法最適合用在說明「傳統痛點」到「AI 轉型」的過場。

視覺佈局： 將頁面垂直二分，或使用左/右對比。

左側 (痛點區)：
色調偏灰藍、紫色。放置疲憊的小智，被混亂的文件與紅色警告標籤包圍。

右側 (方案區)： 色調亮麗（糖果色）。放置開心的 Gemini
機器人，周圍是整齊的 Google Workspace 圖示與金色發光粒子。

核心功能： 讓聽眾第一眼就看到「改變的價值」。

2\. 「SOP 流程圖型」手法 (Linear Progress)

當你在介紹 Gems 或自動化流程時，這是一個非常強大的框架。

視覺佈局： 橫向 1:2:1 比例分布。

左側 (Input)： 堆疊的小圖示（例如：零散的筆記、錄音檔）。

中央 (Process)： 視覺核心。呈現大型發光的 Gemini 寶石
(Gem)，作為資料轉換的核心節點。

右側 (Output)： 產出的成品（例如：完美的公文、專業報告）。

視覺連結： 使用發光的流動線條連接三個區塊，強調「效率」與「順暢感」。

3\. 「核心概念聚焦型」手法 (Central Focus)

適用於定義新名詞（如：什麼是 NotebookLM）或強調單一重點。

視覺佈局： 畫面中央放置大型 3D 角色插畫。

視覺焦點： 小智與 Gemini
共同展示一個發光的物件（如：一本書或一顆寶石）。

文字分布： 標題位於左上或正上方，下方配備 3
個簡短的磨砂透明卡片區塊，分別寫入三個關鍵字。

核心功能： 減少視覺干擾，讓觀眾只記住一個最重要的觀點。

4\. 「資訊儀表板型」手法 (Dashboard/Grid)

當頁面需要包含較多細節摘要或多項功能介紹時使用。

視覺佈局： 採用網格 (Grid) 設計，將頁面分為 3 至 4 個區塊。

區塊設計： 每個區塊使用半透明磨砂玻璃質感 (Frosted
Glass)，背景透出淡雅的糖果色系光暈。

圖文配比： 每個區塊上方一個 3D Q 版小 Icon（例如：Gemini
的發光球體、放大鏡、或齒輪），下方則是 2 行精簡的文字摘要。

核心功能： 保持專業感，即使資訊量較多也不會顯得雜亂。

5\. 「四向矩陣分析型」 (2x2 Matrix / SWOT)

適用於優劣分析、市場定位或四個象限的比較。

視覺佈局： 十字切割畫面。

設計細節： 中心點放置 Gemini
球體，四個象限使用不同淺糖果色底塊（粉紅、淺藍、淺綠、淺黃）。

應用場景： SWOT 分析、急迫性 vs. 重要性矩陣。

6\. 「環狀循環型」 (Circular Flow)

強調「持續優化」或「生態系」的概念。

視覺佈局： 小智站在圓心，Gemini 帶領著 3-5 個功能圖示繞著圓周旋轉。

設計細節： 使用發光的霓虹光圈路徑連接各點，強調循環不息的動態感。

應用場景： PDCA 循環、AI 學習模型、產品生命週期。

7\. 「金字塔階層型」 (Pyramid Hierarchy)

呈現等級、優先順序或基礎架構。

視覺佈局： 一座 3D 階梯金字塔。

設計細節：
底層較寬，色調較穩重；頂層發光，放置核心目標。小智可以爬在階梯上指著上方。

應用場景： 需求層次理論、企業組織架構、技術底層架構。

8\. 「時光隧道里程碑」 (Timeline / Roadmap)

展示過去的成就或未來的發展藍圖。

視覺佈局： 一條從左下延伸到右上（或蛇行）的 3D 發光路徑。

設計細節： 節點使用「浮空島嶼」或「發光地標」呈現，Gemini
像嚮導一樣在前方飛行。

應用場景： 年度計畫、公司發展史、專案進度表。

9\. 「多維雷達圖型」 (Radar / Spider Chart)

展現綜合能力或多項指標的平衡。

視覺佈局： 幾何多邊形框架。

設計細節： 使用 3D
透明玻璃質感的立體雷達圖。小智在旁邊拿著平版電腦分析數據。

應用場景： 團隊能力評估、產品競爭力分析。

10\. 「漏斗轉化型」 (Conversion Funnel)

描述從廣大受眾到精準成交的過濾過程。

視覺佈局： 上寬下窄的 3D 透明漏斗。

設計細節： 頂部湧入大量文件或圖示，經過 Gemini
處理後，底部產出金色的鑽石或核心價值。

應用場景： 行銷漏斗、數據篩選流程、招募流程。

11\. 「天平/槓桿對比型」 (Balance / Comparison)

強調兩者間的平衡、取捨或優劣比較。

視覺佈局： 一個大型的 3D 翹翹板或天平。

設計細節： 左邊放「傳統成本」，右邊放「AI 效益」，Gemini
站在右邊讓天平傾向效益端。

應用場景： 成本效益分析 (ROI)、新舊方案比較。

12\. 「拼圖連結型」 (Puzzle/Integration)

強調團隊合作或各組件如何拼湊成一個整體。

視覺佈局： 幾塊正在拼合的大型 3D 拼圖塊。

設計細節： 小智拿著最後一塊拼圖，Gemini 負責焊接發光的接縫，象徵 AI
是最後的關鍵拼圖。

應用場景： 系統整合、跨部門協作、解決方案總結。

13\. 「階梯式進階導引」 (Stepped Tutorial / Progression)

這正是您提到的「步驟一、步驟二」最理想的呈現方式，強調由淺入深的執行感。

視覺佈局： 畫面呈現一組由左下往右上的 3D 階梯（或發光方塊路徑）。

設計細節： 每個階梯側面標註大的數字（1, 2,
3）。「小智」正在跨上階梯，而「Gemini」在對應的步驟旁展示該動作的成果（例如：點擊按鈕、生成文字）。

應用場景： 軟體操作教學、三步驟上手指南、等級提升計畫。

14\. 「放射狀心智發散」 (Radial Expansion / Mind Map)

適合用在從一個核心點出發，延伸出多個應用情境或腦力激盪時。

視覺佈局： 核心概念位於畫面中央，向四周發散出 4-6
個半透明的圓形或泡泡感分支出去。

設計細節：
「Gemini」位於中心發光，「小智」則在其中一個延伸的分支旁做筆記，象徵從
AI 核心衍生出各種可能性。

應用場景： 應用場景發想、產品多功能介紹、多部門協作規劃。

15\. 「樹狀邏輯決策樹」 (Logic Tree / Decision Path)

當內容涉及「如果\...就\...」的邏輯判斷時，這個框架能幫助使用者理清思路。

視覺佈局： 從左側的一個節點出發，向右分裂成兩個或多個路徑。

設計細節：
路徑使用霓虹發光線條。「小智」站在分叉路口思考，「Gemini」則在不同的終點給出對應的建議圖示（例如：勾勾或驚嘆號）。

應用場景： 疑難排解 (Troubleshooting)、策略選擇評估、自動化流程邏輯。

16\. 「維恩交集尋找區」(Venn Diagram / Sweet Spot)

用於說明多個條件重疊下的「最佳解」或「核心競爭力」。

視覺佈局： 兩個或三個 3D 透明磨砂質感的圓圈相互重疊。

設計細節：
重疊的交集區域顏色最為明亮。「小智」與「Gemini」共同站在交集處（Sweet
Spot）歡呼，象徵找到了最優方案。

應用場景： 市場定位分析、跨領域結合、找出 AI 應用的最優點。

17\. 「冰山底層型」 (The Iceberg / Hidden Value)

用於揭示表面現象下的關鍵支撐，非常適合說明「AI
背後的技術細節」或「隱性成本」。

視覺佈局：
畫面被水平線切開，上方是露出的一小截冰山，下方則是巨大的深層結構。

設計細節：
「小智」站在冰山頂端，而「Gemini」潛入水下的透明發光區，指著巨大的數據核心（Data
Quality）或算力支撐（Computing Power）。

應用場景： 解釋 AI 產出背後的數據品質、隱形成本分析、技術架構底層。

18\. 「火箭噴射型」 (The Rocket Launch / Speed & Scaling)

強調業務的「爆發性成長」或專案「正式啟動」的瞬間。

視覺佈局： 一顆 3D 造型火箭斜向右上角衝刺，後方帶著糖果色的噴射煙霧。

設計細節：
「小智」坐在火箭艙內，「Gemini」化身為噴射推進器的一部分，周圍散布著向上飛升的
KPI 指標。

應用場景： 產品發佈、業績衝刺目標、AI 效能加速。

19\. 「盾牌防衛型」 (The Shield / Security & Compliance)

在 2026 年，隱私與資安是 AI 應用的重中之重，這是一個必備的視覺符號。

視覺佈局： 中央有一個巨大的半透明發光護盾（Hexagon Shield）。

設計細節：
「小智」在護盾後方安心工作，「Gemini」操作護盾擋住外部的紅色警告符號或雜亂數據，象徵合規與保護。

應用場景： 資料隱私說明、網路資安佈署、AI 倫理與法律合規。

20\. 「磁鐵吸引型」 (The Magnet / Attraction & Retention)

適用於描述行銷流量、用戶獲取或核心價值的凝聚力。

視覺佈局： 一個巨大的 U 型發光磁鐵位於畫面一側或中心。

設計細節：
磁鐵吸引著各種糖果色的圖示（如用戶頭像、錢幣、或讚好符號）。「小智」正在調整磁鐵，「Gemini」在磁場路徑上引導。

應用場景： 行銷漏斗的前端、用戶增長策略、核心人才招募。

21\. 「跨越橋樑型」 (Digital Bridge / Transformation)

描述從「舊系統/舊思維」轉移到「新世界」的過程，強調連結性。

視覺佈局： 畫面兩側是孤島，中間橫跨一座發光的數位橋樑。

設計細節：
「小智」正從左側灰色孤島跑向右側彩色孤島，「Gemini」在橋中央伸手迎接，象徵過渡期的引導與轉型。

應用場景： 數位轉型計畫、新舊系統對接、組織文化變革。

22\. 「齒輪連動型」 (Interlocking Gears / Synergy)

適合描述多個部門或多套系統如何「精密對接」與「協作運作」。

視覺佈局： 三到四個相互咬合的大型 3D 透明齒輪。

設計細節：
齒輪中心分別是不同的功能圖示。「小智」在手持平板監控運作，「Gemini」在齒輪結合處注入發光的能量流（潤滑油）。

應用場景： 跨部門協作機制、自動化 SOP 整合、軟硬體整合方案。

23\. 「能量電池型」 (Battery/Gauge / Efficiency & Resource)

直觀地呈現「效能、進度或剩餘資源」，給人一種即時性的掌控感。

視覺佈局： 一個大型的橫向或縱向 3D 電池/能量柱。

設計細節：
能量顯示為彩色漸層發光。「小智」在旁邊查看顯示屏，「Gemini」正在將一塊發光的「AI
模組」裝進電池槽，讓能量瞬間充滿。

應用場景： 效能優化報告、資源分配狀況、專案完成進度百分比。

24\. 「種子成長型」 (Seed to Tree / Lifecycle)

描述一個想法或專案從雛形到全面成熟的完整生命週期。

視覺佈局：
畫面由左至右分別呈現「種子埋土」、「發芽茁壯」、「長成大樹」三個狀態。

設計細節：
「小智」在灑水（澆灌點子），「Gemini」在上方發光（提供養分/光合作用），最後大樹上結滿了金色的
AI 寶石果實。

應用場景： 產品生命週期管理 (PLC)、人才培育計畫、長期戰略佈署。

25\. 「顯微鏡深掘型」 (Microscope Dive / Detail Analysis)

當需要從大量數據中找出「關鍵痛點」或進行「根本原因分析」時使用。

視覺佈局： 畫面左側或上方是一個巨大的 3D
顯微鏡（或放大鏡），鏡頭對準下方一個微小的像素或零件。

設計細節：
「小智」在調整旋鈕，「Gemini」在旁邊投射出鏡頭下的放大全息影像（顯示出問題核心），讓觀眾感覺像是在看細節。

應用場景： 產品品質檢驗、深度數據分析、找出 Bug 或關鍵失敗原因。

26\. 「藍圖架構型」 (Blueprint Design / System Architecture)

適用於展示「施工中」或「系統底層邏輯」的規劃，強調專業感與嚴謹性。

視覺佈局： 背景是一張深藍色的 3D 虛擬網格圖紙（Blueprint）。

設計細節：
「小智」拿著捲尺在測量，而「Gemini」正在用雷射光束在空中描繪出透明的建築物或系統結構框圖。

應用場景： 技術底層設計、專案初期規劃、組織變革架構圖。

27\. 「山峰攻頂型」 (Mountain Peak / Ambition & Vision)

不同於里程碑（Timeline），這個框架強調「最終目標」的艱巨與達成後的榮耀感。

視覺佈局： 一座高聳雲霄的 3D 山峰。

設計細節：
山頂插著一面發光的旗幟（核心願景）。「小智」與「Gemini」正站在山腰向頂端望去，身後是一條蜿蜒而上的小徑，強調「挑戰」與「展望」。

應用場景： 年度長期目標、品牌願景、激勵士氣的結語。

28\. 「自動輸送帶型」 (Conveyor Belt / Automated Pipeline)

專門描述「內容工廠」或「高頻率自動化產線」的流動感，強調量產與穩定。

視覺佈局： 一條斜向延伸的 3D 自動輸送帶。

設計細節：
輸送帶上跑著一排排發光的寶石（成果）。「Gemini」在輸送帶旁擔任檢驗員，「小智」在末端拿著籃子收割，象徵
AI 帶來的批量產出效率。

應用場景： AI 自動化內容生產、供應鏈流程優化、數位營銷自動化。

29\. 「燈塔指引型」 (Lighthouse Guidance / Authority & Standard)

當你的專案或工具是在「混亂中提供方向」或「設定業界標準」時。

視覺佈局： 畫面一側是高聳的 3D 燈塔，發出一道強烈的糖果色光束。

設計細節：
海面（或數據海）波濤洶湧，遠方有迷失的小船。「小智」站在燈塔頂端，「Gemini」化身為那道指引迷航的核心光源。

應用場景： 產業趨勢分析、企業轉型指導原則、建立標準作業規範。

30\. 「三稜鏡折射型」 (Prism Refraction / Diverse Perspectives)

用於描述「一個核心理念，產生多樣化應用」的情境。

視覺佈局： 畫面中心是一個發光的 3D 三角稜鏡。

設計細節：
左側射入一道純白光（核心數據/理念），經過稜鏡後，右側折射出七彩的光帶（代表不同的產品線、不同部門的應用）。「小智」在驚嘆，「Gemini」引導光束。

應用場景： 一源多用策略（One Source, Multi-use）、核心價值推廣至各部門。

31\. 「實驗室燒瓶型」 (Lab Experiment / Innovation & Testing)

強調「研發中」、「不斷嘗試」與「敏捷迭代」的科學精神。

視覺佈局： 實驗桌上有各種發光的 3D 燒瓶與試管。

設計細節：
瓶子裡冒著糖果色的氣泡，「小智」戴著護目鏡在滴入藥水，「Gemini」則在旁邊記錄數據，象徵「AI
輔助實驗」。

應用場景： 新產品研發、A/B 測試結果、創新專案孵化階段。

32\. 「塔台調度型」 (Control Tower / Orchestration & Management)

適合描述「複雜專案的中心化控管」，強調掌控全局的能力。

視覺佈局： 一個 3D 的飛行調度中心，前方有大面積的環繞螢幕。

設計細節：
螢幕上顯示各種閃爍的點與路徑。「小智」坐在中心指揮椅，「Gemini」身化為無數個虛擬助手在各個螢幕間穿梭。

應用場景： 跨部門大型專案管理、中後台運營監控、整合式數位管理平台。

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

第三階段：Banana 圖像生產流水線

現在進入「圖像生成」環節。為了保持一致性，我們需要採用「結構化提示詞」。

標準提示詞結構 = \[畫面主體描述\] + \[風格母咒\] + \[參數設定\]

步驟 4：Gemini 轉譯圖像需求：「AI
不是替代，是增強」。我們需要將這個抽象概念轉化為具體圖像描述。

Prompt (給 Gemini):

請先記住下面我的總體視覺與風格規範，不要生成圖片。之後我會給你內頁文字稿內容，依照此風格與規範直接生成圖片，讓圖片保持一致性與多樣性。

總體視覺與風格規範：

• 風格設定：3D 渲染 Q 版風格 (3D Chibi
Style)，色調活潑亮麗（糖果色系）。

• 核心人物：Q 版職人「小智」（戴大眼鏡、藍色帽
T）與圓滾滾的發光機器人「Gemini」。

• 畫面佈局：16:9 比例，包含中文標題區、情境插畫區。

•
以簡報專家能力，依照情境內容，採用下面適合的32種核心呈現框架之一或者綜合多個框架，整合後產生新的繪製圖片提示詞，再使用這個進行圖片繪製，保持生動且專業。

• 16:9 (設定為簡報比例)

未來的科技職場：32 組 AI 繪圖提示詞 (3D Q版風格)

1\. 情境對比型 (Problem vs. Solution)

Prompt: 3D render, chibi style, split composition. Left side: Dim
purple-grey tone, Xiao Zhi looks exhausted with messy paper stacks and
red warning icons. Right side: Bright candy colors, Gemini robot
smiling, organized Google Workspace icons, glowing gold particles, clean
minimalist white background, high-tech warmth.

2\. SOP 流程圖型 (Linear Progress)

Prompt: 3D render, horizontal 1:2:1 layout. Left: Scattered 3D icons of
messy notes. Center: A large, glowing hexagonal Gemini Gem as a data
hub. Right: A perfectly formatted digital report icon. Glowing neon
lines connect the three sections, 3D chibi style, soft clay texture,
minimalist.

3\. 核心概念聚焦型 (Central Focus)

Prompt: 3D render, center composition. Xiao Zhi and Gemini robot jointly
holding a large glowing 3D light bulb. Three floating frosted glass
cards below for text. Clean pastel background, high-tech minimalist
office vibe, soft lighting, 4k resolution.

4\. 資訊儀表板型 (Dashboard/Grid)

Prompt: 3D isometric view, grid layout with 4 frosted glass tiles. Each
tile features a 3D icon (Gemini sphere, magnifying glass, gear, clock).
Soft candy color glow behind each tile. Minimalist tech environment,
Xiao Zhi standing in the corner pointing at the grid, 3D chibi style.

5\. 四向矩陣分析型 (2x2 Matrix)

Prompt: 3D render, 2x2 matrix layout. A central glowing Gemini sphere at
the crosshair. Four quadrants in soft pink, light blue, light green, and
lemon yellow. Professional yet playful 3D style, clean lines, minimalist
tech workplace aesthetic.

6\. 環狀循環型 (Circular Flow)

Prompt: 3D render, circular composition. Xiao Zhi stands at the center,
Gemini robot leads 4 floating function icons in a glowing orbit. Neon
light paths connecting the icons, dynamic energy, candy color palette,
soft shadows, high-tech minimalism.

7\. 金字塔階層型 (Pyramid Hierarchy)

Prompt: 3D render, a stepped 3D pyramid made of frosted glass. Bottom
layers are stable mint green, top layer is glowing gold with a star
icon. Xiao Zhi is climbing the stairs, pointing towards the top.
Minimalist white space, high-tech warmth.

8\. 時光隧道里程碑 (Timeline)

Prompt: 3D render, a winding glowing path from bottom-left to top-right.
Floating islands as milestones with years marked. Gemini robot flying
ahead as a guide, Xiao Zhi walking on the path. Candy-colored nebula
background, high-tech minimalist style.

9\. 多維雷達圖型 (Radar Chart)

Prompt: 3D render, a large 3D holographic radar chart made of
transparent glass. Xiao Zhi holding a tablet analyzing the data. Vibrant
glowing data points, clean tech office background, soft global
illumination, Octane render.

10\. 漏斗轉化型 (Conversion Funnel)

Prompt: 3D render, a large transparent 3D funnel. Messy data icons
falling into the top, Gemini robot processing in the middle, glowing
gold diamonds emerging from the bottom. High-tech minimalist, candy
colors, soft clay texture.

11\. 天平/槓桿對比型 (Balance)

Prompt: 3D render, a large 3D seesaw. Left side: Heavy grey stones
labeled \"Manual Work.\" Right side: Light glowing Gemini robot making
the seesaw tilt towards efficiency. Clean minimalist background, warm
professional lighting.

12\. 拼圖連結型 (Puzzle)

Prompt: 3D render, large interlocking 3D puzzle pieces. Xiao Zhi holding
the final glowing piece, Gemini robot welding the seams with golden
light. High-tech collaboration vibe, soft pastel colors, minimalist
aesthetic.

13\. 階梯式進階導引 (Stepped Tutorial)

Prompt: 3D render, three ascending glowing blocks labeled 1, 2, 3. Xiao
Zhi stepping onto the first block, Gemini robot demonstrating a task on
the third. Clean white environment, high-tech warmth, 3D chibi style.

14\. 放射狀心智發散 (Radial Expansion)

Prompt: 3D render, Gemini robot at the center emitting 5 glowing
bubbles, each containing a workplace icon (chat, mail, code). Xiao Zhi
taking notes next to one bubble. Soft candy colors, frosted glass
texture, minimalist.

15\. 樹狀邏輯決策樹 (Logic Tree)

Prompt: 3D render, neon light paths branching from left to right. Xiao
Zhi standing at a fork in the road, Gemini robot at the ends showing
\"Success\" checkmarks. High-tech minimalist, soft clay style.

16\. 維恩交集尋找區 (Venn Diagram)

Prompt: 3D render, three overlapping transparent frosted glass circles.
The intersection area is glowing intensely. Xiao Zhi and Gemini standing
in the sweet spot, celebrating. Professional, minimalist, warm lighting.

17\. 冰山底層型 (The Iceberg)

Prompt: 3D render, horizontal split. Above water: A small iceberg peak
with Xiao Zhi. Below water: A massive glowing digital structure with
Gemini robot pointing at data cores. High-tech depth, soft blue and gold
tones.

18\. 火箭噴射型 (The Rocket Launch)

Prompt: 3D render, a cute 3D rocket blasting off diagonally. Xiao Zhi in
the cockpit, Gemini as the engine booster. Candy-colored smoke clouds,
upward flying KPI icons. High-energy, high-tech minimalist.

19\. 盾牌防衛型 (The Shield)

Prompt: 3D render, a large hexagonal glowing shield made of frosted
glass. Xiao Zhi working safely behind it, Gemini blocking red
\"insecure\" icons. Clean white background, sense of security, high-tech
warmth.

20\. 磁鐵吸引型 (The Magnet)

Prompt: 3D render, a large U-shaped glowing magnet. It is attracting
various candy-colored icons (users, coins, likes). Xiao Zhi adjusting
the magnet, Gemini guiding the flow. Minimalist high-tech office style.

21\. 跨越橋樑型 (Digital Bridge)

Prompt: 3D render, a glowing digital bridge connecting a grey island to
a colorful high-tech island. Xiao Zhi running across, Gemini waiting at
the end with open arms. Soft lighting, 3D chibi style, transformation
theme.

22\. 齒輪連動型 (Interlocking Gears)

Prompt: 3D render, three interlocking transparent gears. Xiao Zhi
monitoring with a tablet, Gemini pouring glowing energy into the gears.
High-tech synergy, pastel color palette, minimalist.

23\. 能量電池型 (Battery/Gauge)

Prompt: 3D render, a large vertical 3D battery with glowing
candy-colored segments. Gemini inserting a \"Gem\" module to charge it.
Xiao Zhi cheering. Clean minimalist background, high efficiency vibe.

24\. 種子成長型 (Seed to Tree)

Prompt: 3D render, three stages: a glowing seed, a sprout, and a
tech-tree with golden fruit. Xiao Zhi watering, Gemini providing light.
High-tech life cycle, warm minimalist aesthetic.

25\. 顯微鏡深掘型 (Microscope Dive)

Prompt: 3D render, a large stylized 3D microscope. Xiao Zhi looking
through, Gemini projecting a holographic enlarged view of a tiny
bug/data point. High-tech analysis, soft lighting, 3D chibi style.

26\. 藍圖架構型 (Blueprint Design)

Prompt: 3D render, a dark blue grid floor. Gemini drawing 3D holographic
structures in the air with lasers. Xiao Zhi holding a digital blueprint.
Professional, high-tech minimalist, crisp lines.

27\. 山峰攻頂型 (Mountain Peak)

Prompt: 3D render, a tall stylized 3D mountain. A glowing flag on top.
Xiao Zhi and Gemini standing at the base looking up at a winding path.
Ambition and vision, warm candy colors, minimalist.

28\. 自動輸送帶型 (Conveyor Belt)

Prompt: 3D render, a diagonal conveyor belt carrying glowing gems.
Gemini acting as quality control, Xiao Zhi collecting gems at the end.
Automated workplace, high-tech minimalist, soft clay texture.

29\. 燈塔指引型 (Lighthouse Guidance)

Prompt: 3D render, a high-tech 3D lighthouse emitting a wide
candy-colored beam. Xiao Zhi at the top, Gemini as the light source. A
calm digital sea in the background. Guidance and authority, minimalist.

30\. 三稜鏡折射型 (Prism Refraction)

Prompt: 3D render, a center 3D glass prism. A single white light beam
entering from left, refracting into a rainbow of workplace icons on the
right. Xiao Zhi amazed, Gemini guiding the light. High-tech minimalist.

31\. 實驗室燒瓶型 (Lab Experiment)

Prompt: 3D render, futuristic 3D flasks with bubbling candy-colored
liquid. Xiao Zhi in goggles, Gemini recording digital data. Innovation
and testing, soft global illumination, high-tech warmth.

32\. 塔台調度型 (Control Tower)

Prompt: 3D render, a futuristic control room with curved holographic
screens. Xiao Zhi in the commander chair, Gemini flying between screens.
Orchestration and management, high-tech minimalist, professional
lighting.

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

步驟
4：一張一張建立圖像，不光是內頁，也包括特別針對簡報封面與指定風格的操作方式。

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

產生簡報頁第一頁：

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

針對下面的內容的概念，請幫我描述一個具體的畫面場景後再使用我的總體視覺與風格規範進行繪圖。

標題：從「替代」到「共生」：2025 企業生存的新規則

趨勢洞察： AI 不再是工具，而是企業的新型競爭成員。

戰略維度： 重新定義管理邊界，釋放組織的潛在產能。

未來願景： 建立一個由人類智慧驅動、AI 效能支撐的高敏捷組織。

金句： 2025 年，競爭的本質不再是人與機器的對抗，而是團隊如何與 AI
協同進化。

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

產生簡報頁第二頁：

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

針對下面的內容的概念，請幫我描述一個具體的畫面場景後再使用我的總體視覺與風格規範進行繪圖。

標題：全球浪潮：AI Agents 帶領的第二次管理革命

技術躍升： 生成式 AI 正在進化為能主動執行任務、輔助決策的「智能體
(Agents)」。

市場現實： 數位化領先企業已將 AI 深度嵌入核心業務，而非僅止於行政輔助。

管理門檻： 決策速度已成為企業成敗的分水嶺，傳統的人工流程已難以應付。

金句： AI 不會取代管理者，但懂 AI 的管理者將取代不懂的人。

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

產生簡報第一頁：只要封面設計

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

針對下面的內容的概念，請幫我描述一個具體的畫面場景後再使用我的總體視覺與風格規範進行繪圖。

文字的部份只保留標題就好，目的是章節的封面，保持乾淨整潔。

標題：從「替代」到「共生」：2025 企業生存的新規則

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

指定樣式風格：塔台調度型(展示複雜專案的中心化控管與全局掌握)

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

針對下面的內容的概念，請幫我描述一個具體的畫面場景後再使用我的總體視覺與風格規範進行繪圖。

這一次跳過原先套用的樣版，直接這個風格：塔台調度型 (Control Tower)

Prompt: 3D render, a futuristic control room with curved holographic
screens. Xiao Zhi in the commander chair, Gemini flying between screens.
Orchestration and management, high-tech minimalist, professional
lighting.

標題：全球浪潮：AI Agents 帶領的第二次管理革命

技術躍升： 生成式 AI 正在進化為能主動執行任務、輔助決策的「智能體
(Agents)」。

市場現實： 數位化領先企業已將 AI 深度嵌入核心業務，而非僅止於行政輔助。

管理門檻： 決策速度已成為企業成敗的分水嶺，傳統的人工流程已難以應付。

金句： AI 不會取代管理者，但懂 AI 的管理者將取代不懂的人。

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

調整風格：(canvas)

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

將下面提示詞樣版調整成美少女戰士風格

• 風格設定：3D 渲染 Q 版風格 (3D Chibi
Style)，色調活潑亮麗（糖果色系）。

• 核心人物：Q 版職人「小智」（戴大眼鏡、藍色帽
T）與圓滾滾的發光機器人「Gemini」。

• 畫面佈局：16:9 比例，包含中文標題區、情境插畫區。

•
以簡報專家能力，依照情境內容，採用下面適合的32種核心呈現框架之一或者綜合多個框架，整合後產生新的繪製圖片提示詞，再使用這個進行圖片繪製，保持生動且專業。

• 16:9 (設定為簡報比例)

32種核心呈現框架：

1\. 「情境對比型」手法 (Problem vs. Solution)

這種手法最適合用在說明「傳統痛點」到「AI 轉型」的過場。

視覺佈局： 將頁面垂直二分，或使用左/右對比。

左側 (痛點區)：
色調偏灰藍、紫色。放置疲憊的小智，被混亂的文件與紅色警告標籤包圍。

右側 (方案區)： 色調亮麗（糖果色）。放置開心的 Gemini
機器人，周圍是整齊的 Google Workspace 圖示與金色發光粒子。

核心功能： 讓聽眾第一眼就看到「改變的價值」。

2\. 「SOP 流程圖型」手法 (Linear Progress)

當你在介紹 Gems 或自動化流程時，這是一個非常強大的框架。

視覺佈局： 橫向 1:2:1 比例分布。

左側 (Input)： 堆疊的小圖示（例如：零散的筆記、錄音檔）。

中央 (Process)： 視覺核心。呈現大型發光的 Gemini 寶石
(Gem)，作為資料轉換的核心節點。

右側 (Output)： 產出的成品（例如：完美的公文、專業報告）。

視覺連結： 使用發光的流動線條連接三個區塊，強調「效率」與「順暢感」。

3\. 「核心概念聚焦型」手法 (Central Focus)

適用於定義新名詞（如：什麼是 NotebookLM）或強調單一重點。

視覺佈局： 畫面中央放置大型 3D 角色插畫。

視覺焦點： 小智與 Gemini
共同展示一個發光的物件（如：一本書或一顆寶石）。

文字分布： 標題位於左上或正上方，下方配備 3
個簡短的磨砂透明卡片區塊，分別寫入三個關鍵字。

核心功能： 減少視覺干擾，讓觀眾只記住一個最重要的觀點。

4\. 「資訊儀表板型」手法 (Dashboard/Grid)

當頁面需要包含較多細節摘要或多項功能介紹時使用。

視覺佈局： 採用網格 (Grid) 設計，將頁面分為 3 至 4 個區塊。

區塊設計： 每個區塊使用半透明磨砂玻璃質感 (Frosted
Glass)，背景透出淡雅的糖果色系光暈。

圖文配比： 每個區塊上方一個 3D Q 版小 Icon（例如：Gemini
的發光球體、放大鏡、或齒輪），下方則是 2 行精簡的文字摘要。

核心功能： 保持專業感，即使資訊量較多也不會顯得雜亂。

5\. 「四向矩陣分析型」 (2x2 Matrix / SWOT)

適用於優劣分析、市場定位或四個象限的比較。

視覺佈局： 十字切割畫面。

設計細節： 中心點放置 Gemini
球體，四個象限使用不同淺糖果色底塊（粉紅、淺藍、淺綠、淺黃）。

應用場景： SWOT 分析、急迫性 vs. 重要性矩陣。

6\. 「環狀循環型」 (Circular Flow)

強調「持續優化」或「生態系」的概念。

視覺佈局： 小智站在圓心，Gemini 帶領著 3-5 個功能圖示繞著圓周旋轉。

設計細節： 使用發光的霓虹光圈路徑連接各點，強調循環不息的動態感。

應用場景： PDCA 循環、AI 學習模型、產品生命週期。

7\. 「金字塔階層型」 (Pyramid Hierarchy)

呈現等級、優先順序或基礎架構。

視覺佈局： 一座 3D 階梯金字塔。

設計細節：
底層較寬，色調較穩重；頂層發光，放置核心目標。小智可以爬在階梯上指著上方。

應用場景： 需求層次理論、企業組織架構、技術底層架構。

8\. 「時光隧道里程碑」 (Timeline / Roadmap)

展示過去的成就或未來的發展藍圖。

視覺佈局： 一條從左下延伸到右上（或蛇行）的 3D 發光路徑。

設計細節： 節點使用「浮空島嶼」或「發光地標」呈現，Gemini
像嚮導一樣在前方飛行。

應用場景： 年度計畫、公司發展史、專案進度表。

9\. 「多維雷達圖型」 (Radar / Spider Chart)

展現綜合能力或多項指標的平衡。

視覺佈局： 幾何多邊形框架。

設計細節： 使用 3D
透明玻璃質感的立體雷達圖。小智在旁邊拿著平版電腦分析數據。

應用場景： 團隊能力評估、產品競爭力分析。

10\. 「漏斗轉化型」 (Conversion Funnel)

描述從廣大受眾到精準成交的過濾過程。

視覺佈局： 上寬下窄的 3D 透明漏斗。

設計細節： 頂部湧入大量文件或圖示，經過 Gemini
處理後，底部產出金色的鑽石或核心價值。

應用場景： 行銷漏斗、數據篩選流程、招募流程。

11\. 「天平/槓桿對比型」 (Balance / Comparison)

強調兩者間的平衡、取捨或優劣比較。

視覺佈局： 一個大型的 3D 翹翹板或天平。

設計細節： 左邊放「傳統成本」，右邊放「AI 效益」，Gemini
站在右邊讓天平傾向效益端。

應用場景： 成本效益分析 (ROI)、新舊方案比較。

12\. 「拼圖連結型」 (Puzzle/Integration)

強調團隊合作或各組件如何拼湊成一個整體。

視覺佈局： 幾塊正在拼合的大型 3D 拼圖塊。

設計細節： 小智拿著最後一塊拼圖，Gemini 負責焊接發光的接縫，象徵 AI
是最後的關鍵拼圖。

應用場景： 系統整合、跨部門協作、解決方案總結。

13\. 「階梯式進階導引」 (Stepped Tutorial / Progression)

這正是您提到的「步驟一、步驟二」最理想的呈現方式，強調由淺入深的執行感。

視覺佈局： 畫面呈現一組由左下往右上的 3D 階梯（或發光方塊路徑）。

設計細節： 每個階梯側面標註大的數字（1, 2,
3）。「小智」正在跨上階梯，而「Gemini」在對應的步驟旁展示該動作的成果（例如：點擊按鈕、生成文字）。

應用場景： 軟體操作教學、三步驟上手指南、等級提升計畫。

14\. 「放射狀心智發散」 (Radial Expansion / Mind Map)

適合用在從一個核心點出發，延伸出多個應用情境或腦力激盪時。

視覺佈局： 核心概念位於畫面中央，向四周發散出 4-6
個半透明的圓形或泡泡感分支出去。

設計細節：
「Gemini」位於中心發光，「小智」則在其中一個延伸的分支旁做筆記，象徵從
AI 核心衍生出各種可能性。

應用場景： 應用場景發想、產品多功能介紹、多部門協作規劃。

15\. 「樹狀邏輯決策樹」 (Logic Tree / Decision Path)

當內容涉及「如果\...就\...」的邏輯判斷時，這個框架能幫助使用者理清思路。

視覺佈局： 從左側的一個節點出發，向右分裂成兩個或多個路徑。

設計細節：
路徑使用霓虹發光線條。「小智」站在分叉路口思考，「Gemini」則在不同的終點給出對應的建議圖示（例如：勾勾或驚嘆號）。

應用場景： 疑難排解 (Troubleshooting)、策略選擇評估、自動化流程邏輯。

16\. 「維恩交集尋找區」(Venn Diagram / Sweet Spot)

用於說明多個條件重疊下的「最佳解」或「核心競爭力」。

視覺佈局： 兩個或三個 3D 透明磨砂質感的圓圈相互重疊。

設計細節：
重疊的交集區域顏色最為明亮。「小智」與「Gemini」共同站在交集處（Sweet
Spot）歡呼，象徵找到了最優方案。

應用場景： 市場定位分析、跨領域結合、找出 AI 應用的最優點。

17\. 「冰山底層型」 (The Iceberg / Hidden Value)

用於揭示表面現象下的關鍵支撐，非常適合說明「AI
背後的技術細節」或「隱性成本」。

視覺佈局：
畫面被水平線切開，上方是露出的一小截冰山，下方則是巨大的深層結構。

設計細節：
「小智」站在冰山頂端，而「Gemini」潛入水下的透明發光區，指著巨大的數據核心（Data
Quality）或算力支撐（Computing Power）。

應用場景： 解釋 AI 產出背後的數據品質、隱形成本分析、技術架構底層。

18\. 「火箭噴射型」 (The Rocket Launch / Speed & Scaling)

強調業務的「爆發性成長」或專案「正式啟動」的瞬間。

視覺佈局： 一顆 3D 造型火箭斜向右上角衝刺，後方帶著糖果色的噴射煙霧。

設計細節：
「小智」坐在火箭艙內，「Gemini」化身為噴射推進器的一部分，周圍散布著向上飛升的
KPI 指標。

應用場景： 產品發佈、業績衝刺目標、AI 效能加速。

19\. 「盾牌防衛型」 (The Shield / Security & Compliance)

在 2026 年，隱私與資安是 AI 應用的重中之重，這是一個必備的視覺符號。

視覺佈局： 中央有一個巨大的半透明發光護盾（Hexagon Shield）。

設計細節：
「小智」在護盾後方安心工作，「Gemini」操作護盾擋住外部的紅色警告符號或雜亂數據，象徵合規與保護。

應用場景： 資料隱私說明、網路資安佈署、AI 倫理與法律合規。

20\. 「磁鐵吸引型」 (The Magnet / Attraction & Retention)

適用於描述行銷流量、用戶獲取或核心價值的凝聚力。

視覺佈局： 一個巨大的 U 型發光磁鐵位於畫面一側或中心。

設計細節：
磁鐵吸引著各種糖果色的圖示（如用戶頭像、錢幣、或讚好符號）。「小智」正在調整磁鐵，「Gemini」在磁場路徑上引導。

應用場景： 行銷漏斗的前端、用戶增長策略、核心人才招募。

21\. 「跨越橋樑型」 (Digital Bridge / Transformation)

描述從「舊系統/舊思維」轉移到「新世界」的過程，強調連結性。

視覺佈局： 畫面兩側是孤島，中間橫跨一座發光的數位橋樑。

設計細節：
「小智」正從左側灰色孤島跑向右側彩色孤島，「Gemini」在橋中央伸手迎接，象徵過渡期的引導與轉型。

應用場景： 數位轉型計畫、新舊系統對接、組織文化變革。

22\. 「齒輪連動型」 (Interlocking Gears / Synergy)

適合描述多個部門或多套系統如何「精密對接」與「協作運作」。

視覺佈局： 三到四個相互咬合的大型 3D 透明齒輪。

設計細節：
齒輪中心分別是不同的功能圖示。「小智」在手持平板監控運作，「Gemini」在齒輪結合處注入發光的能量流（潤滑油）。

應用場景： 跨部門協作機制、自動化 SOP 整合、軟硬體整合方案。

23\. 「能量電池型」 (Battery/Gauge / Efficiency & Resource)

直觀地呈現「效能、進度或剩餘資源」，給人一種即時性的掌控感。

視覺佈局： 一個大型的橫向或縱向 3D 電池/能量柱。

設計細節：
能量顯示為彩色漸層發光。「小智」在旁邊查看顯示屏，「Gemini」正在將一塊發光的「AI
模組」裝進電池槽，讓能量瞬間充滿。

應用場景： 效能優化報告、資源分配狀況、專案完成進度百分比。

24\. 「種子成長型」 (Seed to Tree / Lifecycle)

描述一個想法或專案從雛形到全面成熟的完整生命週期。

視覺佈局：
畫面由左至右分別呈現「種子埋土」、「發芽茁壯」、「長成大樹」三個狀態。

設計細節：
「小智」在灑水（澆灌點子），「Gemini」在上方發光（提供養分/光合作用），最後大樹上結滿了金色的
AI 寶石果實。

應用場景： 產品生命週期管理 (PLC)、人才培育計畫、長期戰略佈署。

25\. 「顯微鏡深掘型」 (Microscope Dive / Detail Analysis)

當需要從大量數據中找出「關鍵痛點」或進行「根本原因分析」時使用。

視覺佈局： 畫面左側或上方是一個巨大的 3D
顯微鏡（或放大鏡），鏡頭對準下方一個微小的像素或零件。

設計細節：
「小智」在調整旋鈕，「Gemini」在旁邊投射出鏡頭下的放大全息影像（顯示出問題核心），讓觀眾感覺像是在看細節。

應用場景： 產品品質檢驗、深度數據分析、找出 Bug 或關鍵失敗原因。

26\. 「藍圖架構型」 (Blueprint Design / System Architecture)

適用於展示「施工中」或「系統底層邏輯」的規劃，強調專業感與嚴謹性。

視覺佈局： 背景是一張深藍色的 3D 虛擬網格圖紙（Blueprint）。

設計細節：
「小智」拿著捲尺在測量，而「Gemini」正在用雷射光束在空中描繪出透明的建築物或系統結構框圖。

應用場景： 技術底層設計、專案初期規劃、組織變革架構圖。

27\. 「山峰攻頂型」 (Mountain Peak / Ambition & Vision)

不同於里程碑（Timeline），這個框架強調「最終目標」的艱巨與達成後的榮耀感。

視覺佈局： 一座高聳雲霄的 3D 山峰。

設計細節：
山頂插著一面發光的旗幟（核心願景）。「小智」與「Gemini」正站在山腰向頂端望去，身後是一條蜿蜒而上的小徑，強調「挑戰」與「展望」。

應用場景： 年度長期目標、品牌願景、激勵士氣的結語。

28\. 「自動輸送帶型」 (Conveyor Belt / Automated Pipeline)

專門描述「內容工廠」或「高頻率自動化產線」的流動感，強調量產與穩定。

視覺佈局： 一條斜向延伸的 3D 自動輸送帶。

設計細節：
輸送帶上跑著一排排發光的寶石（成果）。「Gemini」在輸送帶旁擔任檢驗員，「小智」在末端拿著籃子收割，象徵
AI 帶來的批量產出效率。

應用場景： AI 自動化內容生產、供應鏈流程優化、數位營銷自動化。

29\. 「燈塔指引型」 (Lighthouse Guidance / Authority & Standard)

當你的專案或工具是在「混亂中提供方向」或「設定業界標準」時。

視覺佈局： 畫面一側是高聳的 3D 燈塔，發出一道強烈的糖果色光束。

設計細節：
海面（或數據海）波濤洶湧，遠方有迷失的小船。「小智」站在燈塔頂端，「Gemini」化身為那道指引迷航的核心光源。

應用場景： 產業趨勢分析、企業轉型指導原則、建立標準作業規範。

30\. 「三稜鏡折射型」 (Prism Refraction / Diverse Perspectives)

用於描述「一個核心理念，產生多樣化應用」的情境。

視覺佈局： 畫面中心是一個發光的 3D 三角稜鏡。

設計細節：
左側射入一道純白光（核心數據/理念），經過稜鏡後，右側折射出七彩的光帶（代表不同的產品線、不同部門的應用）。「小智」在驚嘆，「Gemini」引導光束。

應用場景： 一源多用策略（One Source, Multi-use）、核心價值推廣至各部門。

31\. 「實驗室燒瓶型」 (Lab Experiment / Innovation & Testing)

強調「研發中」、「不斷嘗試」與「敏捷迭代」的科學精神。

視覺佈局： 實驗桌上有各種發光的 3D 燒瓶與試管。

設計細節：
瓶子裡冒著糖果色的氣泡，「小智」戴著護目鏡在滴入藥水，「Gemini」則在旁邊記錄數據，象徵「AI
輔助實驗」。

應用場景： 新產品研發、A/B 測試結果、創新專案孵化階段。

32\. 「塔台調度型」 (Control Tower / Orchestration & Management)

適合描述「複雜專案的中心化控管」，強調掌控全局的能力。

視覺佈局： 一個 3D 的飛行調度中心，前方有大面積的環繞螢幕。

設計細節：
螢幕上顯示各種閃爍的點與路徑。「小智」坐在中心指揮椅，「Gemini」身化為無數個虛擬助手在各個螢幕間穿梭。

應用場景： 跨部門大型專案管理、中後台運營監控、整合式數位管理平台。

\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--
