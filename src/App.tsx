/**
 * React<Kitten> (react-kitten) is a desktop environment for the web.
 * Copyright (C) 2024, Oğuzhan Eroğlu (https://meowingcat.io) <meowingcate@gmail.com>
 * 
 * GitHub: https://github.com/rohanrhu/react-kitten
 * NPM: https://www.npmjs.com/package/react-kitten
 * 
 * This project and its source code is licensed under the MIT license,
 * found in the LICENSE file in the root directory of this source tree.
 * (MIT License: https://opensource.org/licenses/MIT)
 */

import React, { useState, useEffect } from 'react'

import {
  Manager, Spaces, Space, Window, BasicWindow, TitleBar,
  Title, Buttons, CloseButton, Content, usePosition, useSize, useKittenId,
  StageButton
} from '@react-kitten'

import '@fontsource-variable/merienda'
import '@fontsource-variable/josefin-sans'

import './App.css'

const SPACES_NUM = 10

function Header() {
  return <div className="Header">
    <div className="Header_logo">
      <div className="Header_logo_image">
        <img className="Header_logo_image_img" src="/images/kitten.png" alt="Kitten, desktop environment for the web" />
      </div>
      <div className="Header_logo_text colorful">
        React﹤Kitten﹥
      </div>
    </div>
  </div>
}

function App() {
  const [size, setSize] = useState<[number, number]>([window.innerWidth, window.innerHeight])
  const [space, setSpace] = useState(0)
  
  useEffect(() => {
    const handleResize = () => setSize([window.innerWidth, window.innerHeight])
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  return <div className="App">
    <Manager size={size}>
      <Spaces
        space={space}
        onSpaceChange={setSpace}
      >
        <Space>
          <Header />
          <h1 className="colorful colorful__secondary">Welcome to React&lt;Kitten&gt;</h1>
          <p>React&lt;Kitten&gt; is a desktop environment for the web. It is a React component library that allows you to create desktop-like applications in the browser.</p>
          <p>Kitten is inspired by macOS' Aqua and Stage Manager.</p>

          <button style={{marginRight: 10}}>
            Previous Space
          </button>
          <button onClick={() => setSpace(space + 1)}>
            Next Space
          </button>

          <MyWindow title="Cats and Kittens">
            <h2>Window</h2>
            <p>Window content</p>
          </MyWindow>
        </Space>
        {Array.from({ length: SPACES_NUM }).map((_, i) => <Space key={i}>
          <Header />
          <h1 className="">Space {i}</h1>
          <p>Space {i} Lorem ipsum dolor sit amet consectetur adipisicing elit. Possimus repellat, inventore dolores cum aliquid nam. Ex in deleniti minima cum tempora eum placeat perspiciatis, quasi, quod, iusto a consequuntur cumque.</p>

          <button onClick={() => setSpace(Math.max(space - 1, 0))} style={{marginRight: 10}}>
            Previous Space
          </button>
          <button onClick={() => setSpace(Math.min(space + 1, SPACES_NUM))}>
            Next Space
          </button>

          <MyWindow title="Cats and Kittens">
            <h2>Window {i}</h2>
            <p>Window {i} content</p>
          </MyWindow>
        </Space>)}
      </Spaces>
    </Manager>
  </div>
}

function MyWindow({ title }: React.PropsWithChildren & { title?: string }) {
  const [kittenId,] = useKittenId()
  const [position, setPosition] = usePosition([300, 100])
  const [opened, setOpened] = useState(true)
  const [size, setSize] = useSize([500, 400])
  const [staged, setStaged] = useState(false)
  const [alwaysOnTop,] = useState(false)
  
  const [openedCats, setOpenedCats] = useState<string[]>([])
  const [cats, setCats] = useState<string[]>([])
  
  useEffect(() => {
    fetch('https://api.thecatapi.com/v1/images/search?limit=10')
      .then(res => res.json())
      .then(data => setCats(data.map((cat: { url: string }) => cat.url)))
  }, [])

  return <>
    {opened ? <Window
      kittenId={kittenId}
      position={position} onPositionChange={setPosition}
      size={size} onSizeChange={setSize}
      staged={staged} onStagedChange={setStaged}
      alwaysOnTop={alwaysOnTop}
    >
      <TitleBar onMove={setPosition}>
        <Buttons>
          <CloseButton onClick={() => setOpened(false)} />
          <StageButton onClick={() => setStaged(!staged)} />
        </Buttons>
        <Title>{title}</Title>
      </TitleBar>
      <Content>
        <CatList cats={cats} onCatClick={cat => setOpenedCats([...openedCats, cat])} />
      </Content>
    </Window>: <div style={{margin: 10}}>
      <button onClick={() => setOpened(true)}>
        Open Window
      </button>
    </div>}
    {openedCats.map((cat, i) => <BasicWindow key={i} title="Cat" initialSize={[400, 300]}>
      <img src={cat} alt="cat" style={{ width: '100%', height: 'auto' }} />
    </BasicWindow>)}
  </>
}

function CatList({ cats, onCatClick }: React.PropsWithChildren & { cats: string[], onCatClick?: (cat: string) => void }) {
  return <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 10,
    padding: 10,
    height: '100%'
  }}>
    {cats.map((cat, i) =>
      <img
        key={i} src={cat} alt="cat"
        style={{
          width: '100%',
          height: 'auto',
          marginBottom: 10,
        }}
        onClick={() => onCatClick?.(cat)}
      />
    )}
  </div>
}

export default App
