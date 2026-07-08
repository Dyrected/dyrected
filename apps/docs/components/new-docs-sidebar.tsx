'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'fumadocs-core/link'
import { usePathname } from 'fumadocs-core/framework'
import { useDocsLayout } from 'fumadocs-ui/layouts/docs'
import type { SidebarProps } from 'fumadocs-ui/layouts/docs/slots/sidebar'
import {
  SidebarContent,
  SidebarDrawerContent,
  SidebarDrawerOverlay,
  SidebarTrigger,
  SidebarViewport,
  useSidebar,
} from 'fumadocs-ui/components/sidebar/base'
import { cn } from '@/lib/utils'

type TreePageNode = {
  type: 'page'
  name: ReactNode
  url: string
}

type TreeSeparatorNode = {
  type: 'separator'
  name?: ReactNode
}

type TreeFolderNode = {
  type: 'folder'
  name: ReactNode
  children: TreeNode[]
}

type TreeRootNode = {
  children: TreeNode[]
}

type TreeNode = TreeFolderNode | TreePageNode | TreeSeparatorNode

type Topic = {
  key: string
  title: ReactNode
  pages: TreePageNode[]
}

type Group = {
  key: string
  title: ReactNode
  topics: Topic[]
}

function isFolderNode(node: TreeNode): node is TreeFolderNode {
  return node.type === 'folder'
}

function isPageNode(node: TreeNode): node is TreePageNode {
  return node.type === 'page'
}

function buildGroups(tree: TreeRootNode): Group[] {
  return tree.children.filter(isFolderNode).map((group, groupIndex) => ({
    key: `group-${groupIndex}`,
    title: group.name,
    topics: group.children.filter(isFolderNode).map((topic, topicIndex) => ({
      key: `group-${groupIndex}-topic-${topicIndex}`,
      title: topic.name,
      pages: topic.children.filter(isPageNode),
    })),
  }))
}

function isPageActive(pathname: string, url: string): boolean {
  return pathname === url || pathname.startsWith(`${url}/`)
}

function getActiveTopicKeys(groups: Group[], pathname: string): Record<string, string | null> {
  const out: Record<string, string | null> = {}

  for (const group of groups) {
    const activeTopic = group.topics.find((topic) =>
      topic.pages.some((page) => isPageActive(pathname, page.url)),
    )
    out[group.key] = activeTopic?.key ?? null
  }

  return out
}

function GroupsNav({
  groups,
  pathname,
  openTopics,
  onToggleTopic,
}: {
  groups: Group[]
  pathname: string
  openTopics: Record<string, string | null>
  onToggleTopic: (groupKey: string, topicKey: string) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-2">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-fd-muted-foreground">
            {group.title}
          </h2>
          <div className="flex flex-col gap-1">
            {group.topics.map((topic) => {
              const isOpen = openTopics[group.key] === topic.key
              const hasActivePage = topic.pages.some((page) =>
                isPageActive(pathname, page.url),
              )

              return (
                <div
                  key={topic.key}
                  className={cn(
                    'rounded-xl border border-transparent bg-fd-card/40',
                    (isOpen || hasActivePage) && 'border-fd-border bg-fd-card',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onToggleTopic(group.key, topic.key)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-fd-foreground transition-colors hover:bg-fd-accent/40',
                      hasActivePage && 'text-fd-primary',
                    )}
                  >
                    <span className="flex-1">{topic.title}</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'text-xs text-fd-muted-foreground transition-transform',
                        isOpen ? 'rotate-0' : '-rotate-90',
                      )}
                    >
                      ▾
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="flex flex-col gap-1 px-2 pb-2">
                      {topic.pages.map((page) => {
                        const active = isPageActive(pathname, page.url)

                        return (
                          <Link
                            key={page.url}
                            href={page.url}
                            data-active={active}
                            className={cn(
                              'rounded-lg px-3 py-2 text-sm text-fd-muted-foreground transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground',
                              active && 'bg-fd-primary/10 font-medium text-fd-primary',
                            )}
                          >
                            {page.name}
                          </Link>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function SidebarInner({
  groups,
  pathname,
  banner,
  footer,
}: {
  groups: Group[]
  pathname: string
  banner?: ReactNode
  footer?: ReactNode
}) {
  const { slots } = useDocsLayout()
  const [openTopics, setOpenTopics] = useState<Record<string, string | null>>(() =>
    getActiveTopicKeys(groups, pathname),
  )

  useEffect(() => {
    const next = getActiveTopicKeys(groups, pathname)
    setOpenTopics((prev) => {
      const merged = { ...prev }

      for (const group of groups) {
        if (next[group.key]) merged[group.key] = next[group.key]
      }

      return merged
    })
  }, [groups, pathname])

  const handleToggleTopic = (groupKey: string, topicKey: string) => {
    setOpenTopics((prev) => ({
      ...prev,
      [groupKey]: prev[groupKey] === topicKey ? null : topicKey,
    }))
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b p-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          {slots.navTitle ? (
            <slots.navTitle className="inline-flex items-center gap-2.5 text-[0.9375rem] font-medium" />
          ) : null}
          <div className="md:hidden">
            <SidebarTrigger className="rounded-lg border px-2 py-1 text-xs text-fd-muted-foreground" />
          </div>
        </div>
        {slots.searchTrigger ? (
          <slots.searchTrigger.full hideIfDisabled={true} />
        ) : null}
        {banner}
      </div>

      <SidebarViewport>
        <GroupsNav
          groups={groups}
          pathname={pathname}
          openTopics={openTopics}
          onToggleTopic={handleToggleTopic}
        />
      </SidebarViewport>

      {footer ? <div className="border-t p-4">{footer}</div> : null}
    </>
  )
}

export function NewDocsSidebar({
  tree,
  banner,
  footer,
  className,
  ...rest
}: SidebarProps & {
  tree: TreeRootNode
}) {
  const pathname = usePathname()
  const groups = useMemo(() => buildGroups(tree), [tree])
  const { mode } = useSidebar()

  return (
    <>
      <SidebarContent mode="full">
        {() => (
          <div
            data-sidebar-placeholder=""
            className="sticky top-(--fd-docs-row-1) z-20 h-[calc(var(--fd-docs-height)-var(--fd-docs-row-1))] [grid-area:sidebar] max-md:hidden md:layout:[--fd-sidebar-width:288px]"
          >
            <aside
              id="nd-sidebar"
              className={cn(
                'flex h-full w-(--fd-sidebar-width) flex-col border-e bg-fd-card text-sm',
                className,
              )}
              {...rest}
            >
              <SidebarInner
                groups={groups}
                pathname={pathname}
                banner={banner}
                footer={footer}
              />
            </aside>
          </div>
        )}
      </SidebarContent>

      {mode === 'drawer' ? (
        <>
          <SidebarDrawerOverlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs data-[state=open]:animate-fd-fade-in data-[state=closed]:animate-fd-fade-out" />
          <SidebarDrawerContent
            className={cn(
              'fixed inset-y-0 inset-e-0 z-40 flex w-[88%] max-w-[380px] flex-col border-s bg-fd-background text-sm shadow-lg data-[state=open]:animate-fd-sidebar-in data-[state=closed]:animate-fd-sidebar-out',
              className,
            )}
          >
            <SidebarInner
              groups={groups}
              pathname={pathname}
              banner={banner}
              footer={footer}
            />
          </SidebarDrawerContent>
        </>
      ) : null}
    </>
  )
}
