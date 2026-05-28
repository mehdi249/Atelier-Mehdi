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
        narrative: 'BARAN explores the relationship between protection and vulnerability in contemporary fashion. The collection draws from the relentless energy of storm systems — the way rain reshapes architecture, the drama of dark clouds gathering over a city. Each piece is designed to be both shield and silhouette: outerwear that commands presence while offering genuine shelter. The name BARAN (باران — Persian for rain) grounds the collection in a specific emotional landscape: the quiet intimacy of a storm, the heightened clarity it brings.',
        urls: [],
        images: []
      },
      sketches: { notes: '', images: [] },
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
      research: { narrative: '', urls: [], images: [] },
      sketches: { notes: '', images: [] },
      styleCards: { notes: '', pieces: [] },
      patterns: { notes: '', images: [] },
      clo3d: { notes: '', images: [] },
      construction: { notes: '', images: [] },
      lookbook: { notes: '', images: [] }
    }
  }
}
