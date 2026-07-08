import { docs, newDocs } from '../.source/server'
import { loader } from 'fumadocs-core/source'

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
})

export const newDocsSource = loader({
  baseUrl: '/new-docs',
  source: newDocs.toFumadocsSource(),
})
