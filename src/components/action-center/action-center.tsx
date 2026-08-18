//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useState } from "react";
import { RankedListPanel } from "@/components/action-center/ranked-list-panel";
import { ItemDetailPanel } from "@/components/action-center/item-detail-panel";
import { ReorderActionForm } from "@/components/action-center/reorder-action-form";
import { ReorderActionHistory } from "@/components/action-center/reorder-action-history";

interface SelectedItem {
    key: number;
    name: string;
    tier: string;
}

interface ActionCenterProps {
    /** Stock item name handed off from Page 1's ranked-list click-through, if any. */
    initialSelectedItemName: string | null;
}

export function ActionCenter({ initialSelectedItemName }: ActionCenterProps) {
    const [selected, setSelected] = useState<SelectedItem | null>(null);
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

    return (
        <div className="grid grid-cols-1 gap-500 lg:grid-cols-3">
            <div className="lg:col-span-1">
                <RankedListPanel
                    selectedStockItemKey={selected?.key ?? null}
                    initialSelectedItemName={initialSelectedItemName}
                    onSelectItem={(key, name, tier) => setSelected({ key, name, tier })}
                />
            </div>
            <div className="flex flex-col gap-500 lg:col-span-2">
                <ItemDetailPanel stockItemKey={selected?.key ?? null} />
                {selected ? (
                    <>
                        <ReorderActionForm
                            stockItemKey={selected.key}
                            stockItemName={selected.name}
                            onSubmitted={() => setHistoryRefreshKey((n) => n + 1)}
                        />
                        <ReorderActionHistory stockItemKey={selected.key} refreshKey={historyRefreshKey} />
                    </>
                ) : null}
            </div>
        </div>
    );
}
