
import React, { Component } from 'react'
import {
  View,
  Text,
  ScrollView,
  Image
} from 'react-native'

import { parse } from './parser'
import DEFAULT_STYLES from './styles'
import pick from 'object.pick'
import omit from 'object.omit'
import {
  text as TextStyleProps,
  view as ViewStyleProps
} from './style-props'

import {
  name as packageName
} from './package.json'

const log = (...args) => {
  args.unshift(packageName)
  return console.log(...args)
}

const TextOnlyStyleProps = (function () {
  const props = {}
  TextStyleProps.forEach(prop => {
    props[prop] = true
  })

  ViewStyleProps.forEach(prop => {
    delete props[prop]
  })

  return Object.keys(props)
}())

const DEFAULT_PADDING = 10

const List = props => {

  const children = props.children
  const markdown = props.markdown
  const rest = props

  return (
    React.createElement(View, props, children.map(renderChild))
  )

  function renderChild (child, i) {
    const prefixText = markdown.ordered ? `${i + 1}. ` : '\u2022 '
    const prefixStyle = markdown.ordered ? rest.listStyles.list_item_number :
      rest.listStyles.list_item_bullet
    
    const viewProps = {
      style: {flexDirection: 'row', flex: 1},
      key: `list-el-${i}`
    }
    return (
      React.createElement(View, viewProps,
        React.createElement(Text, {style: prefixStyle}, prefixText),
        child
      )
    )
  }
}

const DEFAULT_RENDERERS = {
  container: ScrollView,
  text: Text
}

const DEFAULT_CUSTOM_RENDERERS = {
  image: (data) => {
    const markdown = data.markdown
    
    const props = omit(data, 'markdown')
    props.source = {uri: markdown.href}

    return React.createElement(Image, props)
  },
  list: List
}

export default function createMarkdownRenderer (markedOpts) {
  const typeToRenderer = Object.assign({},DEFAULT_RENDERERS, DEFAULT_CUSTOM_RENDERERS)

  function renderGroup ({ markdown, markdownStyles={}, style, key }) {
    const type = markdown.type
    const children = markdown.children
    const ordered = markdown.ordered
    const depth = markdown.depth
    const text = markdown.text

    let El = typeToRenderer[type]
    if (!El) {
      El = View
    }

    const isText = type === 'text'
    let elStyles = getStyles({ markdown, markdownStyles, textOnly: isText })
    // only for the container
    if (isText) {
      const ancestorStyles = getAncestorTextStyles({ markdown, markdownStyles })
      // counterintuitive, but works better
      elStyles = elStyles.concat(ancestorStyles)
    }

    if (style) elStyles.push(style)

    let contents
    if (isText) {
      contents = text
    } else if (children) {
      contents = children.map((group, i) => {
        return renderGroup({
          markdown: group,
          markdownStyles,
          key: `child-${i}`
        })
      })
    }

    const elProps = {
      style: flatten(elStyles),
      // styles,
      // markdown,
      key
    }

    if(type === 'list') {
      elProps.listStyles = {
        list_item_bullet: Object.assign(
          {}, DEFAULT_STYLES.list_item_bullet, markdownStyles.list_item_bullet
        ),
        list_item_number: Object.assign(
          {}, DEFAULT_STYLES.list_item_number, markdownStyles.list_item_number
        )
      }
    }   

    if (El !== DEFAULT_RENDERERS[type]) {
      elProps.markdown = markdown
    }

    return React.createElement(El, elProps, contents)
  }

  const Markdown = (data) => {
    const children = data.children
    const rest = omit(data, 'children')

    const parsed = parse(children, markedOpts)
    return renderGroup(Object.assign({ markdown: parsed}, rest))
  }

  Markdown.renderer = typeToRenderer
  return Markdown
}

function getStyles ({ markdown, markdownStyles, textOnly }) {
  const { type, depth } = markdown
  const styleNames = [type]
  if (type === 'heading') styleNames.push(type + depth)

  return styleNames
    .map(styleName => {
      const defaultStyle = DEFAULT_STYLES[styleName]

      return defaultStyle
    })
    .concat(styleNames.map(styleName => markdownStyles[styleName]))
    .filter(style => style != null)
    .map(style => {
      if (typeof style !== 'object') return style

      if (textOnly) {
        return pick(style, TextOnlyStyleProps)
      }

      return omit(style, TextOnlyStyleProps)
    })
}

function getAncestorTextStyles ({ markdown, markdownStyles }) {
  let textStyles = []
  let current = markdown
  while (current = current.parent) {
    textStyles = getStyles({
      markdown: current,
      markdownStyles,
      textOnly: true
    }).concat(textStyles)
  }

  return textStyles
}

function flatten (styleArray) {
  return styleArray.reduce((flat, next) => {
    return Object.assign({}, flat, next)
  }, {})
}

// allow override defaults
export const renderer = DEFAULT_RENDERERS
