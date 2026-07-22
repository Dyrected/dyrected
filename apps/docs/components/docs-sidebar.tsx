'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'fumadocs-core/link'
import { usePathname } from 'fumadocs-core/framework'
import { useDocsLayout } from 'fumadocs-ui/layouts/docs'
import type { SidebarProps } from 'fumadocs-ui/layouts/docs/slots/sidebar'
import {
  SidebarCollapseTrigger,
  SidebarContent,
  SidebarDrawerContent,
  SidebarDrawerOverlay,
  SidebarTrigger,
  SidebarViewport,
  useSidebar,
} from 'fumadocs-ui/components/sidebar/base'
import { ArrowUpRight, Cloud, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
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
  openTopics: Record<string, boolean>
  onToggleTopic: (groupKey: string, topicKey: string) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-3">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-fd-muted-foreground">
            {group.title}
          </h2>
          <div className="flex flex-col gap-0.5">
            {group.topics.map((topic) => {
              const isOpen = openTopics[topic.key] ?? false
              const hasActivePage = topic.pages.some((page) =>
                isPageActive(pathname, page.url),
              )

              return (
                <div key={topic.key} className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => onToggleTopic(group.key, topic.key)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-fd-foreground transition-colors hover:bg-fd-accent/40',
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
                    <div className="flex flex-col gap-1 border-s border-fd-border ms-3 ps-3">
                      {topic.pages.map((page) => {
                        const active = isPageActive(pathname, page.url)

                        return (
                          <Link
                            key={page.url}
                            href={page.url}
                            data-active={active}
                            className={cn(
                              'rounded-md px-2 py-1.5 text-sm text-fd-muted-foreground transition-colors hover:bg-fd-accent/40 hover:text-fd-accent-foreground',
                              active && 'font-medium text-fd-primary',
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

function CloudSidebarCard() {
  return (
    <div className="mt-6 rounded-2xl border border-fd-border bg-linear-to-br from-fd-card via-fd-card to-fd-muted/55 p-4 shadow-[0_18px_46px_-42px_var(--surface-shadow)]">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--accent)] text-[color:var(--accent-foreground)] shadow-[0_10px_28px_-18px_rgba(182,255,46,0.8)]">
        <Cloud className="h-4 w-4" />
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fd-primary">
          Dyrected Cloud
        </p>
        <h3 className="text-sm font-semibold leading-5 text-fd-foreground">
          Want the fastest path to a live Dyrected backend?
        </h3>
        <p className="text-sm leading-5 text-fd-muted-foreground">
          Start with Cloud and get your project provisioned before you wire schemas,
          uploads, and the admin into your app.
        </p>
      </div>
      <Link
        href="/docs/quick-start-guides/nextjs-quick-start/setting-up-your-cloud-site"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[color:var(--accent)] px-3 py-2 text-sm font-medium text-[color:var(--accent-foreground)] transition-transform transition-colors hover:bg-[color:var(--accent-hover)] hover:-translate-y-px"
      >
        Get Started with Cloud
        <ArrowUpRight className="h-4 w-4" />
      </Link>
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
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>(() => {
    const active = getActiveTopicKeys(groups, pathname)
    const initial: Record<string, boolean> = {}

    for (const group of groups) {
      for (const topic of group.topics) {
        initial[topic.key] = active[group.key] === topic.key
      }
    }

    return initial
  })

  useEffect(() => {
    const next = getActiveTopicKeys(groups, pathname)
    setOpenTopics((prev) => {
      const merged: Record<string, boolean> = { ...prev }

      for (const group of groups) {
        const activeKey = next[group.key]

        if (activeKey) merged[activeKey] = true
      }

      return merged
    })
  }, [groups, pathname])

  const handleToggleTopic = (_groupKey: string, topicKey: string) => {
    setOpenTopics((prev) => ({
      ...prev,
      [topicKey]: !prev[topicKey],
    }))
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b p-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          {slots.navTitle ? (
            <slots.navTitle className="inline-flex items-center gap-2.5 text-[0.9375rem] font-medium" />
          ) : null}
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <SidebarTrigger className="rounded-lg border px-2 py-1 text-xs text-fd-muted-foreground" />
            </div>
            <div className="max-md:hidden">
              <SidebarCollapseTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-fd-muted-foreground transition-colors hover:bg-fd-accent/40">
                <PanelLeftClose className="h-4 w-4" />
              </SidebarCollapseTrigger>
            </div>
          </div>
        </div>
        {slots.searchTrigger ? (
          <slots.searchTrigger.full hideIfDisabled={true} />
        ) : null}
        {banner}
      </div>

      <SidebarViewport>
        <div className="flex flex-col">
          <GroupsNav
            groups={groups}
            pathname={pathname}
            openTopics={openTopics}
            onToggleTopic={handleToggleTopic}
          />
          <CloudSidebarCard />
        </div>
      </SidebarViewport>

      {slots.themeSwitch || footer ? (
        <div className="flex items-center gap-3 border-t p-4">
          {footer ? <div className="min-w-0 flex-1">{footer}</div> : <div className="flex-1" />}
          {slots.themeSwitch ? (
            <slots.themeSwitch className="shrink-0 rounded-lg border bg-fd-background p-1 text-fd-muted-foreground transition-colors hover:bg-fd-accent/40 hover:text-fd-foreground" />
          ) : null}
        </div>
      ) : null}
    </>
  )
}

export function DocsSidebar({
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
  const { slots } = useDocsLayout()

  return (
    <>
      <SidebarContent mode="full">
        {({ collapsed, hovered, ref, onPointerEnter, onPointerLeave }) => (
          <div
            data-sidebar-placeholder=""
            className="pointer-events-none sticky top-(--fd-docs-row-1) z-20 h-[calc(var(--fd-docs-height)-var(--fd-docs-row-1))] [grid-area:sidebar] max-md:hidden md:layout:[--fd-sidebar-width:288px]"
          >
            {collapsed && !hovered ? (
              <div className="pointer-events-auto absolute start-3 top-3 z-30 flex flex-col gap-2">
                <SidebarCollapseTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-fd-background text-fd-muted-foreground shadow-sm transition-colors hover:bg-fd-accent/40 hover:text-fd-foreground">
                  <PanelLeftOpen className="h-4 w-4" />
                </SidebarCollapseTrigger>
                {slots.searchTrigger ? (
                  <slots.searchTrigger.sm
                    hideIfDisabled={true}
                    className="h-9 w-9 rounded-xl border bg-fd-background text-fd-muted-foreground shadow-sm transition-colors hover:bg-fd-accent/40 hover:text-fd-foreground"
                  />
                ) : null}
              </div>
            ) : null}
            {collapsed ? (
              <div
                className="pointer-events-auto absolute inset-y-0 inset-s-0 w-4"
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
              />
            ) : null}
            <aside
              id="nd-sidebar"
              ref={ref}
              data-collapsed={collapsed}
              data-hovered={collapsed && hovered}
              onPointerEnter={onPointerEnter}
              onPointerLeave={onPointerLeave}
              className={cn(
                'pointer-events-auto absolute inset-y-0 inset-s-0 flex h-full w-(--fd-sidebar-width) flex-col border-e bg-fd-card text-sm transition-[transform,box-shadow,border-radius,top,bottom] duration-200',
                collapsed &&
                'inset-y-2 -translate-x-(--fd-sidebar-width) rounded-xl border shadow-none',
                collapsed && hovered && 'translate-x-2 shadow-lg rtl:-translate-x-2',
                className,
              )}
              {...rest}
            >
              {!collapsed || hovered ? (
                <SidebarInner
                  groups={groups}
                  pathname={pathname}
                  banner={banner}
                  footer={footer}
                />
              ) : null}
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
