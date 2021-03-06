/**
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import React, { ReactElement, useState, useEffect, useContext } from "react";
import {
  Thing,
  Url,
  UrlString,
  setStringWithLocale,
  setStringNoLocale,
  setThing,
  saveSolidDatasetAt,
  getSourceUrl,
  hasResourceInfo,
} from "@inrupt/solid-client";
import { SessionContext } from "../../context/sessionContext";
import { CommonProperties, useProperty } from "../../helpers";

export type Props = {
  saveDatasetTo?: Url | UrlString;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  locale?: string;
} & CommonProperties;

/**
 * Retrieves and displays a string from a given [Dataset](https://docs.inrupt.com/developer-tools/javascript/client-libraries/reference/glossary/#term-SolidDataset)/[Thing](https://docs.inrupt.com/developer-tools/javascript/client-libraries/reference/glossary/#term-Thing)/property. Can also be used to set/update and persist a string value.
 */
export function Text({
  thing: propThing,
  solidDataset: propDataset,
  property: propProperty,
  properties: propProperties,
  saveDatasetTo,
  locale,
  onSave,
  onError,
  edit,
  autosave,
  inputProps,
  ...other
}: Props & React.HTMLAttributes<HTMLSpanElement>): ReactElement {
  const { fetch } = useContext(SessionContext);

  const { error, value, thing, property, dataset, setDataset } = useProperty({
    dataset: propDataset,
    thing: propThing,
    property: propProperty,
    properties: propProperties,
    type: "string",
    locale,
  });

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const [text, setText] = useState<string | null>(value as string);
  const [, setErrorState] = useState<string | null>();
  const [initialValue, setInitialValue] = useState<string | null>(
    value as string
  );

  /* Save text value in the pod */
  const saveHandler = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (initialValue !== e.target.value && thing && dataset) {
      const newValue = e.target.value;
      let updatedResource: Thing;
      if (locale) {
        updatedResource = setStringWithLocale(
          thing,
          property,
          newValue,
          locale
        );
      } else {
        updatedResource = setStringNoLocale(thing, property, newValue);
      }

      try {
        let savedDataset;
        if (saveDatasetTo) {
          savedDataset = await saveSolidDatasetAt(
            saveDatasetTo,
            setThing(dataset, updatedResource),
            { fetch }
          );

          setDataset(savedDataset);
        } else if (hasResourceInfo(dataset)) {
          savedDataset = await saveSolidDatasetAt(
            getSourceUrl(dataset),
            setThing(dataset, updatedResource),
            { fetch }
          );

          setDataset(savedDataset);
        } else {
          setErrorState(() => {
            throw new Error(
              "Please provide saveDatasetTo location for new data"
            );
          });
        }

        if (onSave) {
          onSave(savedDataset, updatedResource);
        }
      } catch (saveError) {
        if (onError) {
          onError(saveError);
        }
      }
    }
  };

  if (!dataset && !thing) {
    // TODO: provide option for user to pass in loader
    return <h3>fetching data in progress</h3>;
  }

  return (
    <>
      {
        // eslint-disable-next-line react/jsx-props-no-spreading
        !edit && dataset && thing && <span {...other}>{text}</span>
      }
      {edit && dataset && thing && (
        <input
          type={inputProps && inputProps.type ? inputProps.type : "text"}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...inputProps}
          onFocus={(e) => setInitialValue(e.target.value)}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => autosave && saveHandler(e)}
          value={text || ""}
        />
      )}
    </>
  );
}

Text.defaultProps = {
  autosave: false,
  edit: false,
};
