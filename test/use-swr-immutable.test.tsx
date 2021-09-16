import { screen, act, fireEvent } from '@testing-library/react'
import React, { useState } from 'react'
import useSWR from 'swr'
import useSWRImmutable from 'swr/immutable'
import {
  sleep,
  createKey,
  nextTick as waitForNextTick,
  focusOn,
  renderWithConfig
} from './utils'

const focusWindow = () => focusOn(window)

describe('useSWR - immutable', () => {
  it('should revalidate on mount', async () => {
    let value = 0
    const key = createKey()
    const useData = () =>
      useSWR(key, () => value++, {
        dedupingInterval: 0
      })

    function Component() {
      useData()
      return null
    }

    function Page() {
      const [showComponent, setShowComponent] = useState(false)
      const { data } = useData()
      return (
        <div>
          <button onClick={() => setShowComponent(true)}>
            mount component
          </button>
          <p>data: {data}</p>
          {showComponent ? <Component /> : null}
        </div>
      )
    }

    renderWithConfig(<Page />)

    // hydration
    screen.getByText('mount component')
    screen.getByText('data:')

    // ready
    await screen.findByText('data: 0')

    // mount <Component/> by clicking the button
    fireEvent.click(screen.getByText('mount component'))

    // wait for rerender
    await screen.findByText('data: 1')
  })

  it('should not revalidate on mount when `revalidateIfStale` is enabled', async () => {
    let value = 0
    const key = createKey()
    const useData = () =>
      useSWR(key, () => value++, {
        dedupingInterval: 0,
        revalidateIfStale: false
      })

    function Component() {
      useData()
      return null
    }
    function Page() {
      const [showComponent, setShowComponent] = useState(false)
      const { data } = useData()
      return (
        <div>
          <button onClick={() => setShowComponent(true)}>
            mount component
          </button>
          <p>data: {data}</p>
          {showComponent ? <Component /> : null}
        </div>
      )
    }

    renderWithConfig(<Page />)

    // hydration
    screen.getByText('mount component')
    screen.getByText('data:')

    // ready
    await screen.findByText('data: 0')

    // mount <Component/> by clicking the button
    fireEvent.click(screen.getByText('mount component'))

    // wait for rerender
    await act(() => sleep(50))
    await screen.findByText('data: 0')
  })

  it('should not revalidate with the immutable hook', async () => {
    let value = 0
    const key = createKey()
    const useData = () =>
      useSWRImmutable(key, () => value++, { dedupingInterval: 0 })

    function Component() {
      useData()
      return null
    }
    function Page() {
      const [showComponent, setShowComponent] = useState(false)
      const { data } = useData()
      return (
        <div>
          <button onClick={() => setShowComponent(true)}>
            mount component
          </button>
          <p>data: {data}</p>
          {showComponent ? <Component /> : null}
        </div>
      )
    }

    renderWithConfig(<Page />)

    // hydration
    screen.getByText('mount component')
    screen.getByText('data:')

    // ready
    await screen.findByText('data: 0')

    // mount <Component/> by clicking the button
    fireEvent.click(screen.getByText('mount component'))

    // trigger window focus
    await waitForNextTick()
    await focusWindow()

    // wait for rerender
    await act(() => sleep(50))
    await screen.findByText('data: 0')
  })

  it('should not revalidate with revalidateIfStale disabled when key changes', async () => {
    const fetcher = jest.fn(v => v)

    const key = createKey()
    const useData = (id: string) =>
      useSWR(key + id, fetcher, {
        dedupingInterval: 0,
        revalidateIfStale: false
      })

    function Page() {
      const [id, setId] = useState('0')
      const { data } = useData(id)
      return (
        <button onClick={() => setId(id === '0' ? '1' : '0')}>
          data: {data}
        </button>
      )
    }

    renderWithConfig(<Page />)

    // Ready
    await screen.findByText(`data: ${key}0`)

    // Toggle key by clicking the button
    fireEvent.click(screen.getByText(`data: ${key}0`))
    await screen.findByText(`data: ${key}1`)

    await waitForNextTick()

    // Toggle key again by clicking the button
    fireEvent.click(screen.getByText(`data: ${key}1`))
    await screen.findByText(`data: ${key}0`)

    await waitForNextTick()

    // Toggle key by clicking the button
    fireEvent.click(screen.getByText(`data: ${key}0`))
    await screen.findByText(`data: ${key}1`)

    await sleep(20)

    // `fetcher` should only be called twice, with each key.
    expect(fetcher).toBeCalledTimes(2)
    expect(fetcher).nthCalledWith(1, key + '0')
    expect(fetcher).nthCalledWith(2, key + '1')
  })
})
