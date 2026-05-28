import { generateId } from '../utils'

export function createBaranTemplate() {
  return {
    id: 'baran',
    name: 'BARAN',
    tagline: 'A/W 2025 — Elevated Outerwear',
    coverColor: '#1a1a2e',
    progressOverride: null,
    stages: {
      mindMap: {
        nodes: [
          { id: 'root', x: 820, y: 490, text: 'BARAN', type: 'root' },
          { id: 'n1',   x: 470, y: 340, text: 'Inspiration',   type: 'branch' },
          { id: 'n2',   x: 1200, y: 340, text: 'Materials',    type: 'branch' },
          { id: 'n3',   x: 470, y: 640, text: 'Silhouette',    type: 'branch' },
          { id: 'n4',   x: 1200, y: 640, text: 'Colour Story', type: 'branch' },
          { id: 'n5',   x: 230, y: 230, text: 'Rain / Storm',  type: 'leaf' },
          { id: 'n6',   x: 500, y: 190, text: 'Architecture',  type: 'leaf' },
          { id: 'n7',   x: 1100, y: 190, text: 'Technical Fabrics', type: 'leaf' },
          { id: 'n8',   x: 1390, y: 230, text: 'Wool Blends',  type: 'leaf' },
          { id: 'n9',   x: 230, y: 760, text: 'Oversized',     type: 'leaf' },
          { id: 'n10',  x: 500, y: 800, text: 'Structured',    type: 'leaf' },
          { id: 'n11',  x: 1100, y: 800, text: 'Storm Grey',   type: 'leaf' },
          { id: 'n12',  x: 1390, y: 760, text: 'Navy / Slate', type: 'leaf' },
        ],
        edges: [
          { id: 'e1',  from: 'root', to: 'n1' },
          { id: 'e2',  from: 'root', to: 'n2' },
          { id: 'e3',  from: 'root', to: 'n3' },
          { id: 'e4',  from: 'root', to: 'n4' },
          { id: 'e5',  from: 'n1',   to: 'n5' },
          { id: 'e6',  from: 'n1',   to: 'n6' },
          { id: 'e7',  from: 'n2',   to: 'n7' },
          { id: 'e8',  from: 'n2',   to: 'n8' },
          { id: 'e9',  from: 'n3',   to: 'n9' },
          { id: 'e10', from: 'n3',   to: 'n10' },
          { id: 'e11', from: 'n4',   to: 'n11' },
          { id: 'e12', from: 'n4',   to: 'n12' },
        ]
      },
      research: {
        narrative: 'BARAN explores the relationship between protection and vulnerability in contemporary fashion.',
        urls: [],
        images: [],
        references: [
          {
            id: 'ref1', type: 'text', pinned: true, concepts: ['Protection', 'Architecture'],
            content: 'Storm systems as architectural force — buildings designed to channel wind, deflect rain, impose shelter. The Barbican, London: brutalist weather machine. Concrete that sheds water and accumulates character.',
            caption: 'Architecture + Storm',
          },
          {
            id: 'ref2', type: 'url', pinned: false, concepts: ['Architecture'],
            content: 'https://en.wikipedia.org/wiki/Barbican_Centre',
            caption: 'Barbican Centre — Brutalist shelter architecture',
          },
          {
            id: 'ref3', type: 'text', pinned: false, concepts: ['Reflection', 'Silhouette'],
            content: 'Rain on reflective surfaces — puddles become mirrors, wet cobblestone turns cinematic. Blade Runner 2049 opening sequence. The way wet fabric clings, reshapes the silhouette, then releases.',
            caption: 'Film — reflective surfaces',
          },
          {
            id: 'ref4', type: 'text', pinned: false, concepts: ['Protection', 'Cultural Reference'],
            content: 'Traditional Iranian aba — total body protection, dramatic silhouette, enormous emotional weight. A garment that communicates refuge and presence simultaneously.',
            caption: 'Cultural reference — Iranian aba',
          },
        ],
        insights: [
          {
            id: 'ins1',
            title: 'Storm as Protection Language',
            pinned: true,
            concepts: ['Protection', 'Storm Systems'],
            lenses: [
              { id: 'l1', type: 'emotion',    text: 'Simultaneous vulnerability and power. The feeling of being inside a storm: completely present, heightened, alive. BARAN should carry that tension.' },
              { id: 'l2', type: 'silhouette', text: 'Oversized, cocoon-like forms that create a micro-weather zone. Drape like weather systems — heavy at the shoulders, releasing downward.' },
              { id: 'l3', type: 'material',   text: 'Ripstop tension against softer underlayers. Wet-look vs dry-matte contrasts. Technical surfaces that read differently in motion.' },
              { id: 'l4', type: 'function',   text: 'Storm flaps, hidden plackets, adjustable closures that allow transformation between open and sealed states.' },
            ],
          },
          {
            id: 'ins2',
            title: 'Reflective Movement',
            pinned: false,
            concepts: ['Reflection', 'Architecture'],
            lenses: [
              { id: 'l5', type: 'emotion',      text: 'Heightened awareness, hyper-present sensory state. The world made strange and beautiful through a lens of water.' },
              { id: 'l6', type: 'silhouette',   text: 'Asymmetric edges. Seams that reference water flow and optical distortion rather than conventional construction logic.' },
              { id: 'l7', type: 'material',     text: 'Glossy coated fabrics. Metallic wovens. Surfaces that hold light differently at every angle.' },
              { id: 'l8', type: 'construction', text: 'Reflective piping and edge treatments as water channels that guide the eye and serve weather performance.' },
            ],
          },
        ],
        directions: [
          {
            id: 'dir1',
            research: 'Rain creates reflective movement and atmospheric distortion — the world remade, familiar things estranged and illuminated.',
            chips: [
              { id: 't1', category: 'material',     text: 'Glossy ripstop shell with matte contrast underlayer' },
              { id: 't2', category: 'detail',       text: 'Reflective piping along key seam lines' },
              { id: 't3', category: 'silhouette',   text: 'Layered forms referencing atmospheric depth' },
              { id: 't4', category: 'construction', text: 'Asymmetrical seam lines echoing water distortion' },
            ],
          },
          {
            id: 'dir2',
            research: 'Storm systems as architectural shelter — protection that imposes presence rather than disappears into function.',
            chips: [
              { id: 't5', category: 'silhouette',   text: 'Structured dropped shoulders with architectural volume' },
              { id: 't6', category: 'detail',       text: 'Hidden storm flaps and internal snap closures' },
              { id: 't7', category: 'construction', text: 'Internal boning for shape retention at volume points' },
              { id: 't8', category: 'material',     text: 'Technical fabrics with visible construction as design language' },
            ],
          },
        ],
      },
      sketches: { notes: '', images: [], cards: [] },
      styleCards: {
        notes: '',
        pieces: [
          {
            id: 'p1',
            name: 'Storm Coat',
            description: 'Oversized double-breasted coat with hidden storm flap and structured dropped shoulders',
            fabricLayers: {
              shell: { fabric: 'Wool Cashmere Blend', weight: '600g/m²', supplier: 'Loro Piana', notes: 'Storm grey melange' },
              lining: { fabric: 'Silk Charmeuse', weight: '19mm', supplier: 'Sablé Fabrics', notes: 'Deep slate blue' },
              insulation: { fabric: 'PrimaLoft Gold', weight: '60g', supplier: 'PrimaLoft Inc.', notes: 'Mid-weight fill' }
            },
            constructionNotes: 'Hand-stitched lapels. Bound buttonholes in matching cashmere. Internal storm placket with hidden snap closure. Sleeve heads padded and rolled.',
            images: []
          },
          {
            id: 'p2',
            name: 'Technical Jacket',
            description: 'Structured jacket with architectural raglan shoulder seams and concealed snap placket',
            fabricLayers: {
              shell: { fabric: 'Nylon Ripstop', weight: '70D', supplier: 'Toray Industries', notes: 'Slate / charcoal' },
              lining: { fabric: 'Acetate Twill', weight: '90g/m²', supplier: 'Bemberg', notes: 'Matching charcoal' },
              insulation: { fabric: 'Down Fill', weight: '800FP', supplier: 'Allied Feather', notes: 'Lightweight insert, baffled' }
            },
            constructionNotes: 'Welded seams on raglan shoulder seam. Hidden snap placket with magnetic closure back-up. Adjustable cuffs with internal grip tape.',
            images: []
          },
          {
            id: 'p3',
            name: 'Wide Trousers',
            description: 'High-waisted wide-leg trousers with double forward pleat and side buckle adjusters',
            fabricLayers: {
              shell: { fabric: 'Pinstripe Wool', weight: '380g/m²', supplier: 'Dormeuil', notes: 'Charcoal chalk stripe' },
              lining: { fabric: 'Viscose Twill', weight: '80g/m²', supplier: 'Bemberg', notes: 'Matching charcoal' },
              insulation: null
            },
            constructionNotes: 'Double forward crease pressed and stitched in. Hand-rolled and hand-stitched hem. Side buckle adjusters at waistband. Extended rise with internal stay.',
            images: []
          },
          {
            id: 'p4',
            name: 'Knit Layer',
            description: 'Chunky turtleneck knit with dense structural rib and folded collar',
            fabricLayers: {
              shell: { fabric: 'Merino Wool', weight: '14GG', supplier: 'Ermenegildo Zegna', notes: 'Natural off-white' },
              lining: null,
              insulation: null
            },
            constructionNotes: 'Fully fashioned construction — no cut edges. Hand-linked seams throughout. Folded turtleneck collar, unrolled sits below jaw.',
            images: []
          }
        ]
      },
      patterns: { notes: '', images: [] },
      clo3d: { notes: '', images: [] },
      construction: { notes: '', images: [] },
      lookbook: { notes: '', images: [] }
    }
  }
}

export function createEmptyCollection() {
  return {
    id: generateId(),
    name: 'NEW COLLECTION',
    tagline: '',
    coverColor: '#1a1a1a',
    progressOverride: null,
    stages: {
      mindMap: { nodes: [], edges: [] },
      research: { narrative: '', urls: [], images: [], references: [], insights: [], directions: [] },
      sketches: { notes: '', images: [], cards: [] },
      styleCards: { notes: '', pieces: [] },
      patterns: { notes: '', images: [] },
      clo3d: { notes: '', images: [] },
      construction: { notes: '', images: [] },
      lookbook: { notes: '', images: [] }
    }
  }
}
